#!/usr/bin/env python3
"""Windows pythonw runner: private status, bounded safe logs, one process.

Installed by install-sync.ps1 for the current user's login. This process ONLY
downloads consented photos; reference publication remains a separate command.
No token, request body, response body, URL/cursor or exception text is logged.
"""
from __future__ import annotations

import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import sys
import threading

from archive import Archive, ArchiveError, DEFAULT_ROOT, _json
from sync import SyncClient, SyncError, load_config

MAX_LOG_BYTES = 128 * 1024
EVENTS = frozenset({'started', 'sync_ok', 'sync_error', 'stopped'})
ERROR_CODES = frozenset({'configuration', 'network_or_protocol', 'archive', 'unexpected'})
STATES = frozenset({'starting', 'syncing', 'ok', 'error', 'stopped'})


def utc():
    return datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')


def _counts(value):
    if not isinstance(value, dict):
        raise ArchiveError('Invalid sync counters.')
    output = {name: value.get(name) for name in ('imported', 'skipped', 'pages')}
    if any(type(number) is not int or not 0 <= number <= 100_000 for number in output.values()):
        raise ArchiveError('Invalid sync counters.')
    return output


def _timestamp(value):
    return value if isinstance(value, str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z', value) else None


class AlreadyRunning(Exception):
    pass


@contextmanager
def single_process(archive):
    """An OS-held lock also protects manual starts outside Task Scheduler."""
    path = archive.root / '.sync-background.lock'
    fd, acquired = None, False
    try:
        with archive._locked():
            archive._check(path, missing=True)
            fd = os.open(path, os.O_RDWR | os.O_CREAT | getattr(os, 'O_NOFOLLOW', 0), 0o600)
            archive._check(path)
            if os.fstat(fd).st_size == 0:
                archive._reserve(1)
                os.write(fd, b'0')
        try:
            if os.name == 'nt':
                import msvcrt
                os.lseek(fd, 0, os.SEEK_SET)
                msvcrt.locking(fd, msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            raise AlreadyRunning() from None
        acquired = True
        yield
    finally:
        if fd is not None:
            if acquired:
                if os.name == 'nt':
                    import msvcrt
                    os.lseek(fd, 0, os.SEEK_SET)
                    msvcrt.locking(fd, msvcrt.LK_UNLCK, 1)
                else:
                    import fcntl
                    fcntl.flock(fd, fcntl.LOCK_UN)
            os.close(fd)


class PrivateStatus:
    def __init__(self, archive, interval):
        self.archive, self.interval = archive, interval
        self.path = archive.root / 'sync-status.json'
        self.counts = {'imported': 0, 'skipped': 0, 'pages': 0}
        self.last_success = self.last_error = self.last_attempt = None
        with archive._locked():
            archive._check(self.path, missing=True)
            if self.path.exists():
                previous = archive._read_json(self.path)
                if not isinstance(previous, dict):
                    raise ArchiveError('Invalid previous sync status.')
                self.last_success = _timestamp(previous.get('last_success_utc'))
                self.last_error = _timestamp(previous.get('last_error_utc'))
                self.last_attempt = _timestamp(previous.get('last_attempt_utc'))
                if previous.get('counts') is not None:
                    self.counts = _counts(previous['counts'])

    def update(self, state, *, counts=None, error_code=None):
        if state not in STATES or error_code is not None and error_code not in ERROR_CODES:
            raise ArchiveError('Invalid sync status category.')
        now = utc()
        if state == 'syncing':
            self.last_attempt = now
        if state == 'ok':
            self.counts = _counts(counts)
            self.last_success = now
        if state == 'error':
            self.last_error = now
        value = {'schema_version': 1, 'state': state, 'updated_utc': now,
                 'last_attempt_utc': self.last_attempt, 'last_success_utc': self.last_success,
                 'last_error_utc': self.last_error, 'error_code': error_code,
                 'counts': self.counts, 'interval_seconds': self.interval, 'pid': os.getpid()}
        with self.archive._locked():
            self.archive._write(self.path, _json(value))

    def event(self, name, counts=None):
        if name not in EVENTS:
            raise ArchiveError('Invalid sync event category.')
        value = {'utc': utc(), 'event': name}
        if counts is not None:
            value['counts'] = _counts(counts)
        line = (json.dumps(value, separators=(',', ':')) + '\n').encode('ascii')
        paths = [self.archive.root / filename for filename in
                 ('sync-events.log', 'sync-events.log.1', 'sync-events.log.2')]
        with self.archive._locked():
            for path in paths:
                self.archive._check(path, missing=True)
            previous = self.archive._read(paths[0], MAX_LOG_BYTES) if paths[0].exists() else b''
            if len(previous) + len(line) > MAX_LOG_BYTES:
                if paths[2].exists():
                    paths[2].unlink()
                if paths[1].exists():
                    os.replace(paths[1], paths[2])
                if paths[0].exists():
                    os.replace(paths[0], paths[1])
                previous = b''
            self.archive._write(paths[0], previous + line)


def run(archive, config_path, interval=300, *, stop=None, max_cycles=None):
    """Run polls; max_cycles is an offline-test hook, never an installer option."""
    if type(interval) is not int or not 30 <= interval <= 86400:
        raise ArchiveError('Invalid sync interval.')
    stop = stop or threading.Event()
    with single_process(archive):
        status = PrivateStatus(archive, interval)
        status.update('starting')
        status.event('started')
        cycles = 0
        while not stop.is_set():
            status.update('syncing')
            stage = 'configuration'
            try:
                config = load_config(config_path)
                client = SyncClient(archive, **config)
                stage = 'network_or_protocol'
                result = client.pull_once()
                status.update('ok', counts=result)
                status.event('sync_ok', result)
            except SyncError:
                status.update('error', error_code=stage)
                status.event('sync_error')
            except (ArchiveError, OSError):
                status.update('error', error_code='archive')
                status.event('sync_error')
            except Exception:
                # Never format exceptions: upstream errors may embed URLs,
                # credentials or image data. Only a fixed category is retained.
                status.update('error', error_code='unexpected')
                status.event('sync_error')
            cycles += 1
            if max_cycles is not None and cycles >= max_cycles:
                return 0
            if stop.wait(interval):
                break
        status.update('stopped')
        status.event('stopped')
        return 0


def main(argv=None):
    # pythonw sets stdout/stderr to None; imported code must never fail merely
    # because no console exists. Any accidental output is discarded, not logged.
    for name in ('stdout', 'stderr'):
        if getattr(sys, name) is None:
            setattr(sys, name, open(os.devnull, 'w', encoding='utf-8'))
    parser = argparse.ArgumentParser(description='Private ECO Clean photo sync background runner.')
    parser.add_argument('--root', type=Path, default=DEFAULT_ROOT)
    parser.add_argument('--config', type=Path)
    parser.add_argument('--interval', type=int, default=300)
    args = parser.parse_args(argv)
    try:
        return run(Archive(args.root), args.config or args.root / 'sync-config.json', args.interval)
    except (AlreadyRunning, KeyboardInterrupt):
        return 0
    except Exception:
        # Task Scheduler exposes exit code 1 even when private storage/status
        # itself is unavailable. Never emit tracebacks from the hidden process.
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
