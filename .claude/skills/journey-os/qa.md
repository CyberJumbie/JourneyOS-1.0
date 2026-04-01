# /qa — Human QA Verification

Generate SPECIFIC numbered steps for the user to run.
NOT "test the feature" — exact URLs, exact actions, exact expected outcomes.

STEP FORMAT for each QA step:
---
QA Step N: [What you're verifying]
→ Navigate to: [exact URL, e.g. http://localhost:3000/courses/MEDI-601/lectures]
→ Action: [exact action — "Click 'Upload Lecture' button (top right corner)"]
→ Upload (if needed): [exact file from tests/fixtures/ — "tests/fixtures/test-cardiology-50-slides.pptx"]
→ Wait for: [what to watch for + typical time — "Status badge changes from 'Queued' to 'Ready for review' (30-90 seconds)"]
→ Verify: [exact expected state — "Review panel shows at least 5 SubConcept cards with RRF score badges"]
→ Success looks like: [specific visual/data state the user will see]
---

After all steps: "Please run these QA steps and tell me what you see.
Type 'confirmed' if everything worked as described, or describe any failures."

CRITICAL: Wait for the user to respond. Do NOT proceed to /ship until you have their confirmation message.
Store their EXACT message — it goes into the commit.

If user reports a failure:
1. Use /investigate for systematic debugging
2. Fix the specific failure
3. Re-run /validate to confirm fix passes automated tests
4. Restart /qa with the same steps
Never ship with unresolved QA failures.
