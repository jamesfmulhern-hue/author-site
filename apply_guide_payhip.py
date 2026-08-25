import re

PATH = "/home/user/workspace/author-site/guides.html"

# filename fragment -> (payhip_key_placeholder, price)
GUIDES = {
    "Writing-the-Life-A-Students-Guide-to-Memoir.pdf": ("PAYHIP_KEY_WRITINGTHELIFE", "7"),
    "Memoir-Types-and-Model-Outlines-Student-Booklet.pdf": ("PAYHIP_KEY_MEMOIRTYPES", "4"),
    "Writing-the-Memoir-Craft-Handout.pdf": ("PAYHIP_KEY_WRITINGTHEMEMOIR", "4"),
    "The-Art-of-Telling-a-Story.pdf": ("PAYHIP_KEY_ARTOFTELLING", "3"),
    "Silver-Current-Writing-Workshop-Handbook.pdf": ("PAYHIP_KEY_WORKSHOPHANDBOOK", "5"),
    "Publishing-Memoir-and-Personal-Essay.pdf": ("PAYHIP_KEY_PUBLISHINGMEMOIR", "4"),
    "Submitting-Short-Stories.pdf": ("PAYHIP_KEY_SUBMITTINGSTORIES", "4"),
    "Poetry-Submission-Suggestions.pdf": ("PAYHIP_KEY_POETRYSUBMISSION", "3"),
    "The-Submitters-Companion.pdf": ("PAYHIP_KEY_SUBMITTERSCOMPANION", "4"),
    "Student-Workbook-for-Literary-Analysis.pdf": ("PAYHIP_KEY_STUDENTWORKBOOK", "6"),
    "A-Companion-to-Literary-Analysis.pdf": ("PAYHIP_KEY_LITANALYSISCOMPANION", "5"),
    "Teaching-the-Memoir-Types-Instructor-Lecture.pdf": ("PAYHIP_KEY_TEACHINGMEMOIRTYPES", "5"),
}

UPGRADE_TEMPLATE = (
    '\n            <div class="guide-card-upgrade">'
    '<span class="guide-card-upgrade-note">A typeset PDF edition (${price}) is on its way to the store.</span> '
    '<a href="https://payhip.com/b/{key}" class="payhip-buy-button" data-theme="none">Notify Me &rarr;</a></div>'
)

html = open(PATH, "r", encoding="utf-8").read()

if "payhip.js" not in html:
    html = html.replace(
        "</head>",
        '<script type="text/javascript" src="https://payhip.com/payhip.js"></script>\n</head>',
        1,
    )

count = 0
for fragment, (key, price) in GUIDES.items():
    pattern = re.compile(
        r'(<a class="guide-card-dl" href="downloads/' + re.escape(fragment) + r'"[^>]*>Download the PDF</a>)'
    )
    if "guide-card-upgrade" in html and fragment in html:
        # avoid double-inserting if script re-run
        m = pattern.search(html)
        if m:
            tail_check = html[m.end():m.end() + 400]
            if "guide-card-upgrade" in tail_check:
                continue

    upgrade_html = UPGRADE_TEMPLATE.format(key=key, price=price)
    new_html, n = pattern.subn(lambda m: m.group(1) + upgrade_html, html, count=1)
    if n:
        html = new_html
        count += 1
    else:
        print("WARNING: pattern not found for", fragment)

open(PATH, "w", encoding="utf-8").write(html)
print(f"Inserted {count} paid-download upgrade links.")
