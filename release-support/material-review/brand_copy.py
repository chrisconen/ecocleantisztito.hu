"""Exact display-copy branding. Paths, code and identifiers remain untouched."""
import re
from html.parser import HTMLParser

def brand_text(text):
    text=re.sub(r'\b(?:ANDANTE[ \t]+)?NovaLife\b','ANDANTE NovaLife',text,flags=re.I)
    return re.sub(r'\b([Aa]) (?=ANDANTE NovaLife\b)',r'\1z ',text)

def brand_html(source):
    edits=[];lines=[0]
    for m in re.finditer('\n',source):lines.append(m.end())
    class Parser(HTMLParser):
        def __init__(self):super().__init__(convert_charrefs=False);self.ignored=0
        def pos(self):line,col=self.getpos();return lines[line-1]+col
        def edit(self,start,before):
            after=brand_text(before)
            if after!=before:edits.append({'offset':start,'before':before,'after':after})
        def handle_starttag(self,tag,attrs):
            if tag in ('script','style'):self.ignored+=1
            raw=self.get_starttag_text()
            for m in re.finditer(r'''\b(?:aria-label|title|alt|placeholder)\s*=\s*(["'])(.*?)\1''',raw,re.S):self.edit(self.pos()+m.start(2),m[2])
        def handle_startendtag(self,tag,attrs):self.handle_starttag(tag,attrs)
        def handle_endtag(self,tag):
            if tag in ('script','style'):self.ignored=max(0,self.ignored-1)
        def handle_data(self,data):
            if not self.ignored:self.edit(self.pos(),data)
    Parser().feed(source)
    for edit in reversed(edits):
        a=edit['offset'];assert source[a:a+len(edit['before'])]==edit['before'];source=source[:a]+edit['after']+source[a+len(edit['before']):]
    return source,edits

def restore_html(source,edits):
    shift=0;located=[]
    for edit in edits:
        located.append((edit['offset']+shift,edit));shift+=len(edit['after'])-len(edit['before'])
    for start,edit in reversed(located):
        assert source[start:start+len(edit['after'])]==edit['after'],'Brand copy restoration mismatch'
        source=source[:start]+edit['before']+source[start+len(edit['after']):]
    return source
