# Financial AI Needs a Falsification Engine, Not Another Trading Signal

**Arman Margaryan** · Founder, Margaryan Labs  
**October 10, 2026** · Independent perspective · Financial intelligence and research methods

Artificial intelligence is becoming very good at describing what markets *might* be doing. Give an assistant a price chart, an options snapshot, some news, and a list of macroeconomic events, and it can produce a remarkably coherent explanation.

Coherence is not evidence. In finance, the distance between an attractive explanation and a rule that can withstand fresh data is where the real research begins.

I believe the next meaningful step for financial AI is not to generate more confident buy-and-sell signals. It is to build a system that can **disprove weak market hypotheses** before they are mistaken for an edge.

## The abundance problem

AI makes it cheaper to propose ideas: funding-rate dislocations, liquidity shocks, implied-versus-realized volatility, cross-market lead-lag effects, order-book imbalances, or unusual patterns in event-driven flows.

But thousands of attempts create a statistical trap. Even when no real predictive relationship exists, extensive searching can uncover an impressive-looking historical result. If only the winners are reported, the audience sees the product of selection rather than the full research process.

An honest research system should preserve *all* tested hypotheses, not just the successful ones: the first timestamp of the idea, predeclared test design, datasets, variants tried, rejection criteria and negative outcomes.

Without that record, a dramatic backtest may merely measure a researcher's ability to search through randomness.

## Reconstruct what was knowable

A historical trading simulation can quietly use information that was unavailable at the moment a hypothetical decision would have been made.

Examples include revised economic releases, data from an exchange feed after an outage, retrospectively tagged on-chain entities, and cleaned datasets whose timestamps do not reflect the information's original arrival.

The essential question is not “Can this system explain the past?” It is **“Could this exact decision have been made using only information genuinely available at that time?”**

A serious research pipeline therefore needs point-in-time data integrity, preserved source provenance, and explicit handling of missing or delayed observations. A messy but faithful replay can be more informative than a perfectly cleaned historical simulation.

## Make the testing stage adversarial

A model should encounter systematic objections, not only sympathetic performance charts.

A basic falsification program would include:

- Chronological separation of model development and genuinely unseen evaluation windows.
- Realistic assumptions about fees, spread, funding costs, market impact and slippage.
- Comparisons with simple rules and with the decision to do nothing.
- Sensitivity tests for small changes in thresholds, timing, universe and trading venue.
- Drawdown and tail-risk analysis, not just average performance.
- A visible ledger of failed runs and explored alternatives.

The goal is not to find one remarkable metric. It is to determine which claims survive deliberate attempts to invalidate them.

A reported 80% “regime confidence” is not inherently meaningful either. It must be calibrated against observed outcomes; precise presentation is not the same thing as accurate probabilities.

## Separate proposer from critic

AI can be useful in financial research without being given the authority to certify its own conclusions.

One component can be a **proposer**: it reads data, drafts a hypothesis, identifies measurable inputs, and defines a test. A different component can be a **critic**: it searches for confounders, alternative explanations, regime instability, data leakage and evidence that the hypothesis is fragile.

A deterministic testing layer then executes the stated protocol and logs results. A human approval gate separates experimental research from any decision with financial consequences.

If an idea survives, it should advance to another stage of scrutiny: fresh-paper observation, cost-aware simulation or carefully bounded experiments. Passing a historical test is not a license to promise dependable returns.

## What a research dashboard should reveal

Market-intelligence interfaces tend to emphasize the answer: **WAIT**, **BUY** or **SELL**. That can obscure the reasoning and hide the uncertainty.

I would rather see evidence of the question behind each recommendation:

- Which data sources and timestamps were used?
- Which alternative hypotheses were rejected?
- What assumptions were needed to reach the conclusion?
- What would falsify the conclusion going forward?
- Which real-world limitations could make the simulated result disappear?
- What happened after the decision, including when the system was wrong?

A transparent record is more difficult to market than a perfect-looking equity curve. It is also much harder to fake convincingly over time.

## Failure is part of the asset

In a genuinely scientific research environment, failed hypotheses are not embarrassing waste. They help identify false intuitions, unstable relationships, defective measurements, and expensive lines of inquiry that should be abandoned.

Some negative results can be published even when the underlying commercial system remains proprietary. Recording failed experiments under fixed definitions gives future researchers the opportunity to assess whether the process is improving.

My own developmental efforts in **Financial Frontier** and **VETO Intelligence**, within Margaryan Labs, are guided by these principles. These are research and product ambitions; I am not claiming a validated new law of finance, audited returns, or a proven forecasting advantage.

The promise of financial AI will be fulfilled only when its systems become better at challenging the statements they generate.

**A falsification pipeline may ultimately be more valuable than the model that proposed the winning-looking trade.**

---

**About the author.** Arman Margaryan is the founder of Margaryan Labs, an independent early-stage technology initiative developing AI systems for market intelligence and business analytics.

**Disclosure.** This independent article was prepared with AI assistance at the author's direction. It is published on Margaryan Labs' own public GitHub repository; it is not an independent media endorsement or a report of demonstrated investment performance. Nothing in this article constitutes investment advice.

**Contact:** margaryanlabs@gmail.com