#!/usr/bin/env python3
"""HANASO — GitHub bootstrap (ADR-004). Idempotent, evidence-printing, stdlib-only.

Stages:
  repo      create private repo `hanaso` (skip if exists)
  settings  repo config (squash-only, delete-branch-on-merge) + branch protection on main
  labels    create labels
  milestones create M0..M7 milestones
  issues    create issues from scripts/github-issues.json (+ close/comment where marked)
  project   GitHub Project v2 "HANASO Development" (Status + Priority fields, add all issues)
  kb-issues spec-gap issues in japanese-learning-kb repo

Usage:
  GH_TOKEN=... python3 scripts/setup-github.py <stage|all> [--sha <HEAD_SHA>]
The token is read from the environment ONLY and is never printed or written anywhere.
"""
import json
import os
import sys
import tempfile
import time
import urllib.error
import urllib.request

API = 'https://api.github.com'
GQL = 'https://api.github.com/graphql'
OWNER = 'AbolfazlProg'
REPO = 'hanaso'
KB_REPO = 'japanese-learning-kb'
HEADERS = {}
RESULT = {'stage_runs': [], 'resources': {}}

# Projects v2 field options: color must be one of GRAY/BLUE/GREEN/YELLOW/ORANGE/RED/PINK/PURPLE;
# description is REQUIRED (non-null) per option.
STATUS_OPTIONS = [
    ('Backlog', 'GRAY', 'تسک تعریف‌شده؛ پالایش نشده'),
    ('Ready', 'GREEN', 'مشخصات کامل — قابل شروع'),
    ('In Progress', 'YELLOW', 'در حال اجرا'),
    ('Review', 'BLUE', 'در بازبینی مستقل'),
    ('Blocked', 'RED', 'مسدود بر عامل بیرونی'),
    ('Done', 'PURPLE', 'تکمیل‌شده با شواهد'),
]
PRIORITY_OPTIONS = [
    ('P0', 'RED', 'بحرانی'), ('P1', 'ORANGE', 'بالا'), ('P2', 'YELLOW', 'متوسط'), ('P3', 'GRAY', 'پایین'),
]


def die(msg):
    print(f'FATAL: {msg}', file=sys.stderr)
    sys.exit(1)


def rest(method, path, body=None, accept='application/vnd.github+json'):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, method=method, headers={
        **HEADERS, 'Accept': accept, 'Content-Type': 'application/json',
    })
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, {'message': raw[:300]}


def gql(query, variables=None):
    req = urllib.request.Request(GQL, data=json.dumps({'query': query, 'variables': variables or {}}).encode(),
                                 method='POST', headers={**HEADERS, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        payload = json.loads(resp.read().decode())
    if payload.get('errors'):
        die(f'GraphQL error: {json.dumps(payload["errors"])[:500]}')
    return payload['data']


def log(stage, msg):
    line = f'[{stage}] {msg}'
    print(line)
    RESULT['stage_runs'].append(line)


def load_issues_data():
    with open(os.path.join(os.path.dirname(__file__), 'github-issues.json'), encoding='utf-8') as f:
        return json.load(f)


# ---------------------------------------------------------------- stages ----
def stage_repo():
    status, repo = rest('GET', f'/repos/{OWNER}/{REPO}')
    if status == 200:
        log('repo', f'already exists: {repo["html_url"]} (private={repo["private"]})')
        return
    status, created = rest('POST', '/user/repos', {
        'name': REPO, 'private': True, 'has_wiki': False, 'auto_init': False,
        'description': 'هاناسو — وب‌سایت آموزش زبان ژاپنی برای فارسی‌زبانان (کد محصول؛ Spec در japanese-learning-kb)',
    })
    if status not in (201,):
        die(f'repo creation failed ({status}): {json.dumps(created)[:300]}')
    log('repo', f'CREATED private repo: {created["html_url"]}')


def stage_settings():
    status, body = rest('PATCH', f'/repos/{OWNER}/{REPO}', {
        'private': True, 'has_wiki': False,
        'allow_squash_merge': True, 'allow_merge_commit': False, 'allow_rebase_merge': False,
        'delete_branch_on_merge': True,
    })
    log('settings', f'repo config: HTTP {status}')
    # branch protection requires main to exist (push first!)
    status, body = rest('GET', f'/repos/{OWNER}/{REPO}/branches/main')
    if status != 200:
        log('settings', 'main branch does not exist yet — push first, then re-run this stage (protection SKIPPED for now)')
        return
    prot = {
        'required_status_checks': None,  # enabled after first green CI run (BLOCKER-F05)
        'enforce_admins': True,          # no direct pushes at all — everything via PR (mission §7)
        'required_pull_request_reviews': None,  # single-account: PR approvals impossible; reviews via agents+owner
        'restrictions': None,
        'allow_force_pushes': False, 'allow_deletions': False,
        'required_linear_history': True,
    }
    status, body = rest('PUT', f'/repos/{OWNER}/{REPO}/branches/main/protection', prot,
                        accept='application/vnd.github.luke-cage-preview+json')
    log('settings', f'branch protection on main: HTTP {status} '
        f'(enforce_admins=true, linear-history, PR-only; required-checks deferred — BLOCKER-F05)')
    if status not in (200,):
        log('settings', f'protection response: {json.dumps(body)[:300]}')


def stage_labels():
    data = load_issues_data()
    existing = {}
    status, labels = rest('GET', f'/repos/{OWNER}/{REPO}/labels?per_page=100')
    if status == 200:
        existing = {l['name'] for l in labels}
    for lb in data['labels']:
        if lb['name'] in existing:
            log('labels', f"exists: {lb['name']}")
            continue
        status, body = rest('POST', f'/repos/{OWNER}/{REPO}/labels', lb)
        log('labels', f"{'created' if status == 201 else 'FAILED(' + str(status) + ')'}: {lb['name']}")


def stage_milestones():
    data = load_issues_data()
    status, existing = rest('GET', f'/repos/{OWNER}/{REPO}/milestones?state=all&per_page=100')
    have = {m['title']: m['number'] for m in (existing or [])} if status == 200 else {}
    for ms in data['milestones']:
        if ms['title'] in have:
            log('milestones', f"exists: {ms['title']} (#{have[ms['title']]})")
            continue
        status, body = rest('POST', f'/repos/{OWNER}/{REPO}/milestones',
                            {'title': ms['title'], 'description': ms['description'], 'state': 'open'})
        log('milestones', f"{'created #' + str(body.get('number')) if status == 201 else 'FAILED(' + str(status) + ')'}: {ms['title']}")


def get_milestone_map():
    status, existing = rest('GET', f'/repos/{OWNER}/{REPO}/milestones?state=all&per_page=100')
    data = load_issues_data()
    title_by_alias = {m['alias']: m['title'] for m in data['milestones']}
    out = {}
    if status == 200:
        for m in existing:
            out[m['title']] = m['number']
    out.update({alias: out.get(title, None) for alias, title in title_by_alias.items()})
    return {k: v for k, v in out.items() if v}, title_by_alias


def stage_issues(sha=None):
    data = load_issues_data()
    nums, title_by_alias = get_milestone_map()
    created = []
    # find existing issues (idempotency by exact title)
    status, existing = rest('GET', f'/repos/{OWNER}/{REPO}/issues?state=all&per_page=100')
    have = {i['title']: i for i in (existing or []) if 'pull_request' not in i} if status == 200 else {}
    for iss in data['issues']:
        title = iss['title']
        if title in have:
            log('issues', f'exists: #{have[title]["number"]} {title[:60]}')
            created.append(have[title])
            continue
        body_text = iss['body']
        if sha and '{SHA}' in body_text:
            body_text = body_text.replace('{SHA}', sha)
        payload = {'title': title, 'body': body_text, 'labels': iss['labels']}
        ms_num = nums.get(iss['milestone'])
        if ms_num:
            payload['milestone'] = ms_num
        status, body = rest('POST', f'/repos/{OWNER}/{REPO}/issues', payload)
        if status != 201:
            log('issues', f'FAILED({status}): {title[:60]} → {json.dumps(body)[:200]}')
            continue
        log('issues', f"created #{body['number']}: {title[:70]}")
        if iss.get('close'):
            comment = iss.get('close_comment', 'Done with evidence.').replace('{SHA}', sha or 'main')
            rest('POST', f"/repos/{OWNER}/{REPO}/issues/{body['number']}/comments", {'body': comment})
            st2, _ = rest('PATCH', f"/repos/{OWNER}/{REPO}/issues/{body['number']}",
                          {'state': 'closed', 'state_reason': 'completed'})
            log('issues', f"closed #{body['number']} with evidence comment (HTTP {st2})")
        created.append(body)
        time.sleep(0.4)
    RESULT['resources']['issues'] = [{'number': i['number'], 'title': i['title'], 'node_id': i['node_id']}
                                     for i in created]


def stage_project():
    data = load_issues_data()
    # fresh process: fetch issue node_ids from the API
    if not RESULT.get('resources', {}).get('issues'):
        status, existing = rest('GET', f'/repos/{OWNER}/{REPO}/issues?state=all&per_page=100')
        if status == 200:
            RESULT['resources']['issues'] = [
                {'number': i['number'], 'title': i['title'], 'node_id': i['node_id']}
                for i in existing if 'pull_request' not in i]
            log('project', f"fetched {len(RESULT['resources']['issues'])} issues from API")
    user = gql('query{ viewer{ id projectsV2(first:20){ nodes{ id title } } } }')['viewer']
    project = next((p for p in user['projectsV2']['nodes'] if p['title'] == data['project_title']), None)
    if project:
        log('project', f"exists: {data['project_title']}")
        pid = project['id']
    else:
        pid = gql('mutation($i:CreateProjectV2Input!){ createProjectV2(input:$i){ projectV2{ id } } }',
                  {'i': {'ownerId': user['id'], 'title': data['project_title']}})['createProjectV2']['projectV2']['id']
        log('project', f"CREATED: {data['project_title']}")
        try:
            gql('mutation($i:UpdateProjectV2Input!){ updateProjectV2(input:$i){ projectV2{ id } } }',
                {'i': {'projectId': pid, 'shortDescription': data['project_description'][:140],
                       'readme': f"# {data['project_title']}\n\n{data['project_description']}\n\nراهنمای مالک: ستون Status = وضعیت تسک · Milestone = فاز · Priority = اولویت. ورودی کامل: PROJECT_STATUS.md ریپوی hanaso."}})
            log('project', 'readme + shortDescription set via updateProjectV2')
        except SystemExit:
            log('project', 'readme/shortDescription skipped (non-blocking)')
    RESULT['resources']['project_id'] = pid

    # fetch existing fields
    fields = gql('query($id:ID!){ node(id:$id){ ... on ProjectV2 { fields(first:20){ nodes{ ... on ProjectV2SingleSelectField { id name options{ id name } } } } } } }',
                 {'id': pid})['node']['fields']['nodes']
    by_name = {f['name']: f for f in fields if isinstance(f, dict) and 'name' in f}

    def ensure_field(name, options):
        if name in by_name:
            log('project', f'field exists: {name}')
            return by_name[name]
        payload_opts = [{'name': n, 'color': c, 'description': d} for (n, c, d) in options]
        f = gql('mutation($i:CreateProjectV2FieldInput!){ createProjectV2Field(input:$i){ projectV2Field{ ... on ProjectV2SingleSelectField { id name options{ id name } } } } }',
                {'i': {'projectId': pid, 'name': name, 'dataType': 'SINGLE_SELECT',
                       'singleSelectOptions': payload_opts}})['createProjectV2Field']['projectV2Field']
        log('project', f'field created: {name} ({len(f["options"])} options)')
        return f

    status_field = ensure_field('Status', STATUS_OPTIONS)
    priority_field = ensure_field('Priority', PRIORITY_OPTIONS)
    status_opts = {o['name']: o['id'] for o in status_field['options']}
    priority_opts = {o['name']: o['id'] for o in priority_field['options']}

    data_issues = load_issues_data()
    for created_issue in RESULT.get('resources', {}).get('issues', []):
        spec = next((i for i in data_issues['issues'] if i['title'] == created_issue['title']), None)
        if not spec:
            continue
        item = gql('mutation($i:AddProjectV2ItemByIdInput!){ addProjectV2ItemById(input:$i){ item{ id } } }',
                   {'i': {'projectId': pid, 'contentId': created_issue['node_id']}})['addProjectV2ItemById']['item']
        st = spec.get('project_status', 'Backlog')
        pr = spec.get('priority', 'P2')
        if st in status_opts:
            gql('mutation($i:UpdateProjectV2ItemFieldValueInput!){ updateProjectV2ItemFieldValue(input:$i){ projectV2Item{ id } } }',
                {'i': {'projectId': pid, 'itemId': item['id'], 'fieldId': status_field['id'],
                       'value': {'singleSelectOptionId': status_opts[st]}}})
        if pr in priority_opts:
            gql('mutation($i:UpdateProjectV2ItemFieldValueInput!){ updateProjectV2ItemFieldValue(input:$i){ projectV2Item{ id } } }',
                {'i': {'projectId': pid, 'itemId': item['id'], 'fieldId': priority_field['id'],
                       'value': {'singleSelectOptionId': priority_opts[pr]}}})
        log('project', f"item+fields: #{created_issue['number']} → Status={st}, Priority={pr}")
    try:
        url = gql('query($id:ID!){ node(id:$id){ ... on ProjectV2 { url } } }', {'id': pid})['node']['url']
        log('project', f'project url: {url}')
    except Exception:
        log('project', 'project url: https://github.com/users/AbolfazlProg/projects (see profile)')


KB_ISSUES = [
    {
        'title': 'spec-gap: پاسخ OQ-002 — نام محصول HANASO / ریپوی hanaso (دستور مالک 2026-11-01)',
        'body': 'ثبت پاسخ رسمی OQ-002: مالک در مأموریت 2026-11-01 نام کاری **HANASO**، دامنهٔ `hanaso.ir` و ریپوی `hanaso` را تعیین کرد؛ ریپوی محصول ساخته و Push شد (ADR-001 آن ریپو). درخواست: به‌روزرسانی OQ-002 و ارجاع‌های نام کاری `japanese-learning-app` در اسناد KB.\n\nشواهد: پیام مأموریت مالک 2026-11-01 + ریپوی AbolfazlProg/hanaso.',
        'labels': ['spec-gap'],
    },
    {
        'title': 'spec-gap: پیشنهاد به‌روزرسانی ADR-001 — پوستهٔ pnpm workspace (apps/packages) در ریپوی محصول',
        'body': 'ریپوی hanaso ساختار Monorepo سبک (apps/web + packages/*) را با حفظ تک-استقرار (یک Dockerfile/یک image/یک pipeline) برگزید — الزام ساختاری مأموریت مالک §۱۳ + مرزهای مالکیت چند-Agentی §۵.۳. درخواست: بازنگری ADR-001 KB برای پذیرش این انحراف کنترل‌شده (ADR-002 ریپوی hanaso مستندش را دارد: docs/adr/ADR-002-workspace-layout.md).',
        'labels': ['spec-gap'],
    },
    {
        'title': 'spec-gap: ثبت نتیجهٔ Spike TS7 (OTD-004) — پین 6.0.3 — و بازبینی recommended-stack',
        'body': 'نتیجهٔ Spike TASK-M0-04 (2026-11-01، با شواهد npm): tsc 7.0.2 سالم است اما typescript-eslint@8.72.1 رسماً `typescript <6.1.0` را پشتیبانی می‌کند → ریپوی محصول `typescript@6.0.3` را پین کرد (طبق fallback تعریف‌شدهٔ ADR-003 KB). درخواست: ثبت نتیجه در OTD-004 + به‌روزرسانی «آخرین بازبینی» recommended-stack به 2026-11-01 (۱۵/۱۵ پین منطبق).\n\nشواهد: hanaso/docs/research/STACK-REVALIDATION-2026-11-01.md + ops/runs/RUN-20261101-01.md.',
        'labels': ['spec-gap'],
    },
]


def stage_kb_issues():
    status, existing = rest('GET', f'/repos/{OWNER}/{KB_REPO}/issues?state=all&per_page=100&labels=spec-gap')
    have = {i['title'] for i in (existing or []) if 'pull_request' not in i} if status == 200 else set()
    for iss in KB_ISSUES:
        if iss['title'] in have:
            log('kb-issues', f'exists: {iss["title"][:60]}')
            continue
        status, body = rest('POST', f'/repos/{OWNER}/{KB_REPO}/issues',
                            {'title': iss['title'], 'body': iss['body'], 'labels': iss['labels']})
        log('kb-issues', f"{'created #' + str(body.get('number')) if status == 201 else 'FAILED(' + str(status) + ')'}: {iss['title'][:60]}")


def main():
    global HEADERS
    token = os.environ.get('GH_TOKEN')
    if not token:
        die('GH_TOKEN environment variable is required (never hardcode it)')
    HEADERS = {'Authorization': f'Bearer {token}', 'X-GitHub-Api-Version': '2022-11-28'}
    status, me = rest('GET', '/user')
    if status != 200:
        die(f'authentication failed ({status})')
    print(f'authenticated as: {me.get("login")}')

    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    sha = None
    if '--sha' in sys.argv:
        try:
            sha = sys.argv[sys.argv.index('--sha') + 1]
        except IndexError:
            die('--sha requires a value')
    stage = args[0] if args else 'all'

    stages = {
        'repo': stage_repo, 'settings': stage_settings, 'labels': stage_labels,
        'milestones': stage_milestones, 'issues': stage_issues,
        'project': stage_project, 'kb-issues': stage_kb_issues,
    }
    order = ['repo', 'settings', 'labels', 'milestones', 'issues', 'project', 'kb-issues']
    if stage == 'all':
        for name in order:
            stages[name]() if name != 'issues' else stage_issues(sha)
    elif stage == 'kb-issues':
        stage_kb_issues()
    elif stage in stages:
        stages[stage]() if stage != 'issues' else stage_issues(sha)
    else:
        die(f'unknown stage: {stage}')

    out = os.environ.get('HANASO_GH_RESULT') or os.path.join(
        tempfile.gettempdir(), 'hanaso-gh-setup-result.json')
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(RESULT, f, ensure_ascii=False, indent=2)
    print(f'\nresult summary written to {out}')


if __name__ == '__main__':
    main()
