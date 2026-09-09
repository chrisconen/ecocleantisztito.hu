"""Offline background-runner tests. No task installation or network calls."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

from archive import Archive, ArchiveError
from sync import SyncError

spec = importlib.util.spec_from_file_location('sync_background', Path(__file__).with_name('sync-background.py'))
background = importlib.util.module_from_spec(spec)
spec.loader.exec_module(background)

FIXTURE_SECRET = 'fixture-only-private-token-never-used-online-0000000'


class BackgroundTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'private-library'
        self.archive = Archive(self.root)
        self.config = self.root / 'sync-config.json'
        self.stop = Mock()
        self.stop.is_set.return_value = False
        self.stop.wait.return_value = False
        self.client = Mock()
        self.client.pull_once.return_value = {'imported': 2, 'skipped': 3, 'pages': 1}
        self.load = patch.object(background, 'load_config', return_value={
            'endpoint': 'https://ecocleantisztito.hu', 'token': FIXTURE_SECRET})
        self.factory = patch.object(background, 'SyncClient', return_value=self.client)
        self.reviews = patch.object(background, 'pull_reviews', return_value=0)
        self.review_mock = self.reviews.start()
        self.addCleanup(self.reviews.stop)
        self.load.start()
        self.factory.start()
        self.addCleanup(self.load.stop)
        self.addCleanup(self.factory.stop)

    def status(self):
        return json.loads((self.root / 'sync-status.json').read_text(encoding='utf-8'))

    def test_success_records_counts_without_secret_or_automatic_publication(self):
        self.assertEqual(background.run(self.archive, self.config, stop=self.stop, max_cycles=1), 0)
        status = self.status()
        self.assertEqual(status['state'], 'ok')
        self.assertEqual(status['counts'], {'imported': 2, 'skipped': 3, 'pages': 1})
        self.assertEqual(status['interval_seconds'], 300)
        self.assertTrue(status['last_success_utc'].endswith('Z'))
        self.assertIsNone(status['error_code'])
        self.client.publish_references.assert_not_called()
        self.review_mock.assert_called_once_with(self.client)
        for path in [self.root / 'sync-status.json', self.root / 'sync-events.log']:
            self.assertNotIn(FIXTURE_SECRET, path.read_text(encoding='utf-8'))

    def test_network_error_reports_fixed_category_and_recovers_next_poll(self):
        self.client.pull_once.side_effect = [SyncError('unsafe upstream text ' + FIXTURE_SECRET),
                                            {'imported': 1, 'skipped': 0, 'pages': 1}]
        background.run(self.archive, self.config, stop=self.stop, max_cycles=2)
        status = self.status()
        self.assertEqual(status['state'], 'ok')
        self.assertIsNotNone(status['last_error_utc'])
        self.assertEqual(status['counts']['imported'], 1)
        self.stop.wait.assert_called_once_with(300)
        log = (self.root / 'sync-events.log').read_text()
        self.assertIn('sync_error', log)
        self.assertNotIn(FIXTURE_SECRET, log)
        self.assertNotIn('unsafe upstream', log)

    def test_configuration_error_has_status_and_does_not_attempt_network(self):
        with patch.object(background, 'load_config', side_effect=SyncError(FIXTURE_SECRET)):
            background.run(self.archive, self.config, stop=self.stop, max_cycles=1)
        self.assertEqual(self.status()['state'], 'error')
        self.assertEqual(self.status()['error_code'], 'configuration')
        self.client.pull_once.assert_not_called()
        self.assertNotIn(FIXTURE_SECRET, (self.root / 'sync-status.json').read_text())

    def test_unexpected_exception_never_logs_its_body_or_traceback(self):
        self.client.pull_once.side_effect = RuntimeError('payload=' + FIXTURE_SECRET)
        background.run(self.archive, self.config, stop=self.stop, max_cycles=1)
        self.assertEqual(self.status()['error_code'], 'unexpected')
        for path in self.root.glob('sync-*'):
            self.assertNotIn(FIXTURE_SECRET, path.read_text())
            self.assertNotIn('Traceback', path.read_text())

    def test_single_process_lock_rejects_duplicate_and_releases_on_exit(self):
        with background.single_process(self.archive):
            with self.assertRaises(background.AlreadyRunning):
                with background.single_process(self.archive):
                    self.fail('A second background process acquired the lock')
        with background.single_process(self.archive):
            pass

    def test_logs_rotate_at_bound_and_retain_only_three_files(self):
        status = background.PrivateStatus(self.archive, 300)
        with patch.object(background, 'MAX_LOG_BYTES', 256):
            for _ in range(15):
                status.event('sync_ok', {'imported': 1, 'skipped': 0, 'pages': 1})
        logs = list(self.root.glob('sync-events.log*'))
        self.assertEqual(len(logs), 3)
        self.assertTrue(all(path.stat().st_size <= 256 for path in logs))
        self.assertRaises(ArchiveError, status.event, FIXTURE_SECRET)

    def test_stop_records_stopped_and_restart_preserves_last_success(self):
        background.run(self.archive, self.config, stop=self.stop, max_cycles=1)
        previous = self.status()['last_success_utc']
        self.stop.is_set.return_value = True
        background.run(self.archive, self.config, stop=self.stop)
        self.assertEqual(self.status()['state'], 'stopped')
        self.assertEqual(self.status()['last_success_utc'], previous)

    def test_pythonw_null_streams_are_safe_and_duplicate_start_exits_cleanly(self):
        handles = []
        try:
            with patch.object(background.sys, 'stdout', None), patch.object(background.sys, 'stderr', None), \
                    patch.object(background, 'Archive', return_value=self.archive), \
                    patch.object(background, 'run', side_effect=background.AlreadyRunning):
                self.assertEqual(background.main(['--root', str(self.root)]), 0)
                handles = [background.sys.stdout, background.sys.stderr]
                self.assertTrue(all(handle is not None for handle in handles))
        finally:
            for handle in handles:
                handle.close()


if __name__ == '__main__':
    unittest.main()
