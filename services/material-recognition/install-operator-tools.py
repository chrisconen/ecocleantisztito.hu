"""Install two local operator entry files, no task scheduling or email sending."""
from pathlib import Path
from archive import Archive,DEFAULT_ROOT
from review_inbox import gallery
archive=Archive(DEFAULT_ROOT);source=Path(__file__).resolve().parent
launcher='@echo off\r\ncd /d "'+str(source)+'"\r\npython review_inbox.py work\r\npause\r\n'
with archive._locked():
    archive._write(archive.root/'Ellenorzes inditasa.cmd',launcher.encode('utf-8'))
    archive._write(archive.root/'NAPI-ELLENORZES.md',(source/'OPERATIONS.md').read_bytes())
print(gallery(archive))
