# The AI Founder’s Credibility Gap: How to Prove Something Real Before You Have Customers

**Arman Margaryan** · Founder, Margaryan Labs  
**October 10, 2026** · Independent founder perspective · AI startups and product evidence

A small founder can now produce a remarkably polished technology demonstration. Artificial intelligence can help generate interfaces, code, documentation, charts, and product narratives at a speed that used to require a much larger team.

This creates an uncomfortable problem: **the evidence that a product looks sophisticated is getting cheaper much faster than the evidence that it works.**

I am confronting that problem while building Margaryan Labs, an independent, early-stage AI technology initiative. It is not yet incorporated, and we do not have paying customers. I would rather state that plainly than use the visual complexity of our projects as a substitute for traction.

The question is not whether an individual can ship ambitious software with AI assistance. The more interesting question is: **What would a skeptical outsider need to see before trusting that software?**

## A demo is a claim about one moment

A beautiful screen can tell you what a developer intended. It usually cannot tell you how the system behaves when a data source fails, a payment is declined, a model changes its answer, or a user asks a question nobody rehearsed.

Screenshots are useful. They are also selective. A screenshot of a market dashboard does not establish that the prices are fresh. A row of percentages does not establish that the model is calibrated. A successful checkout image does not establish that a customer actually paid.

I think founders should begin making four separate kinds of evidence visible:

1. **Artifact evidence:** a working page, code, documentation, or reproducible demonstration exists.
2. **Behavioral evidence:** the promised workflow has been tested under stated conditions, including failures.
3. **User evidence:** an independent person has used the product and their experience can be substantiated.
4. **Commercial evidence:** customers have paid, retained, expanded, or achieved a measured outcome.

These stages are not interchangeable. A successful deployment belongs in the first or second category. It should not quietly be promoted into the fourth.

## Make a public claims ledger

Here is a practical idea for early-stage founders: publish a small table beside the product, or in a linked public document, with five columns.

| Claim | Evidence | Date | Limitation | Next test |
| --- | --- | --- | --- | --- |
| Visitors can open a product page | Public URL | Observation date | Does not prove full workflow reliability | Test signup and error paths |
| A model returned a particular answer | Original question and provider output | Sampling date | May not generalize to other prompts or model versions | Repeat under fixed conditions |
| A strategy showed positive historical results | Versioned backtest and cost assumptions | Test date | Historical selection and data leakage are possible | Forward paper observation |
| Customers get measurable value | Customer-authorized outcome record | Measurement window | Attribution may remain uncertain | Controlled follow-up |

The ledger is not a rating system. Its job is to expose the difference between a claim and the strongest evidence currently available for it.

A founder does not have to reveal source code or private customer information to do this well. A careful public record can include redacted observations, methodology, anonymized aggregates where appropriate, and a precise description of what remains undisclosed.

It should also include failures. A product that reports only successes asks readers to trust its internal editor.

## Treat AI outputs as observations, not authority

One area we are exploring with [Promptence](https://promptence.tech/) is how companies appear in recommendations produced by AI assistants.

Suppose a model mentions a brand in five responses. That may be interesting, but the number has no meaning until the reader knows which questions were asked, when they were asked, which model was sampled, what counted as a mention, and what happened in the other responses.

There is another distinction: the presence of a brand in a model answer is not proof that the brand won a customer.

A useful system should preserve the original question, the returned answer, explicit sources where available, the interpretation rules, and any later remeasurement. It should also acknowledge that API observations may not match every consumer interface.

The same logic applies to financial AI.

## Finance makes the credibility gap expensive

An AI system can produce a confident market explanation or a beautiful equity curve. Neither establishes predictive power.

Research claims need point-in-time data, an out-of-sample evaluation plan, realistic transaction costs, alternative baselines, and a visible record of rejected hypotheses. Paper trading is valuable only when the experiment's assumptions, execution timing, slippage, and failures are recorded.

At Margaryan Labs, the work around **VETO Intelligence** and **Financial Frontier** explores this direction. It would be misleading to claim that the initiative has discovered a new financial law or demonstrated independently audited trading returns. The goal is to build a better way of asking questions and disproving weak answers.

For a financial research system, “We tested 100 ideas and discarded 98” may eventually be more informative than “Our top idea returned 40%.” The first statement still needs a verifiable testing ledger; the second needs context, risk measurement, and scrutiny for selection bias.

## What I would publish in a founder evidence room

If I were reviewing an early-stage AI product, I would want one page that answers seven questions:

**What is real today?** Link to the running product and label unfinished or restricted features.

**What is simulated?** Separate mock data, historical replay, paper results, and live customer or market behavior.

**What has been tested?** Describe the test window, model versions, failure handling, and comparison procedure.

**What failed?** Preserve a selection of material defects, invalid hypotheses, and incomplete workflows.

**What is externally verified?** Distinguish internal measurement from independent audits, customer testimonials, and third-party publications.

**What remains unproven?** State the absence of traction or independent performance evidence when that is the case.

**What happens next?** Commit to a test that could change the team's belief, not just produce another positive screenshot.

This is not about turning every young company into a compliance department. It is about lowering the cost of honest evaluation for buyers, collaborators, journalists, and potential investors.

## A different definition of progress

With AI-assisted development, it is easy to confuse progress in the volume of software produced with progress in the amount of uncertainty removed.

A thousand new interface components do not automatically answer whether anyone needs the product. A sophisticated research laboratory does not automatically establish a scientific result. More automated outreach does not automatically mean more trusted relationships.

For an independent founder, the useful milestone may be smaller and more demanding: one workflow that survives critical inspection, one repeatable finding, one outsider who can reproduce a result, or one customer who can describe measurable value.

Building in public should mean showing what remains uncertain, not only displaying how fast the work is moving.

I want Margaryan Labs to be judged on this kind of evidence. The work is in an early stage. The ambition is substantial; the proof still has to be earned.

**If you were auditing an AI startup with no customers yet, which single artifact would make you take it seriously?** A live reproducible demo? A rigorous test report? A published failure log? I am genuinely interested in the answer.

---

**About the author.** Arman Margaryan is the founder of Margaryan Labs, an independent, early-stage AI technology initiative developing Promptence and investigating AI-assisted financial research through VETO Intelligence and Financial Frontier.

**Transparency.** Margaryan Labs is not currently incorporated and has no paying customers. This opinion essay was drafted with AI assistance at the author's direction. It is published in Margaryan Labs' own public editorial archive, not by an independent newsroom, and does not claim financial returns, academic discoveries, or outside endorsement.

**Related reading:** [AI Visibility Is Not a Score](./2026-10-10-ai-visibility-is-not-a-score.md) · [Financial AI Needs a Falsification Engine](./2026-10-10-financial-ai-falsification-engine.md)  
**Product:** https://promptence.tech/  
**Editorial contact:** margaryanlabs@gmail.com
