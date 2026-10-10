# AI Visibility Is Not a Score. It Is a Measurement Problem.

**Arman Margaryan** · Founder, Margaryan Labs  
**October 10, 2026** · Independent perspective · AI discovery and measurement

> **Thesis.** AI recommendations are becoming an important part of how buyers discover businesses. A percentage without a reproducible observation behind it is not reliable evidence.

An emerging group of tools promises to tell businesses whether they are “visible to AI.” The pitch is understandable: people ask AI assistants to compare products, find services, and recommend vendors. Companies want to know if they appear in the responses.

But an attractive score between zero and one hundred cannot, on its own, answer the commercial question. It can merely relocate uncertainty from the assistant into a dashboard.

The better question is: **When a particular buyer asks a particular question, which businesses does a specific AI system recommend, what evidence is visible, and does that change under comparable observation?**

## Start with the buyer's decision

Asking an assistant “What is Brand X?” may produce a detailed brand description. That does not show whether the assistant would recommend Brand X to a buyer who has never heard of it.

Real buyer questions are more specific: “Which accounting software works for a small agency?” or “Which hotel would you choose for a family with accessibility requirements?” The constraints, location, category, and reason for choosing matter.

A useful audit begins by freezing those questions *before* measuring. Otherwise, a marketer can rewrite the prompts until the preferred brand appears, and then report the winning screenshot as an objective finding.

## Keep the original output and its provenance

A credible record includes:

1. The original buyer-intent question and context.
2. The provider, model or product surface being sampled, and the observation time.
3. The answer as actually returned.
4. Any citations the system explicitly supplied.
5. Whether the target brand was recommended, merely mentioned, criticized or absent.
6. Errors and timeouts, rather than treating missing responses as zero visibility.

A citation added by an analyst after the fact is not a citation exposed by the AI system. Similarly, the behavior of a provider's API should not be presented as proof of the behavior of every consumer chat interface.

Precision of wording matters. “Mentioned in three of ten API responses from a specified model” can be checked; “AI recommends this brand” usually cannot.

## Sample variability rather than hiding it

AI-generated answers can vary with wording, time, geography, model changes, retrieval configuration, and other context. One favorable response is not a stable market position.

A repeatable study needs a predeclared collection of buyer questions, a consistent sampling protocol, and an explanation of what changed between samples. Repeated results can then be described with honest denominators and uncertainties.

An apparent improvement needs special scrutiny if the sample has shifted. A team that changes the questions, models, or decision criteria after an intervention has not created an apples-to-apples comparison.

## Observation is not causation

Suppose a competitor repeatedly appears while your business does not. This may motivate inspection of your site structure, product positioning, directory entries, public reviews, or source coverage. But the observation alone rarely identifies a single root cause.

I prefer a workflow with distinct stages:

**Observation → hypothesis → approved intervention → verification → comparable remeasurement.**

The hypothesis must remain labeled as a hypothesis. An authorized content or technical change must be recorded. The team should check whether the change actually shipped before attempting to attribute any shift in results to it.

Even after remeasurement, causal claims can remain limited because independent changes may be occurring in other sites, model versions, and retrieval infrastructure.

## A stronger AI visibility report

Before purchasing an “AI visibility” product or service, I would ask to inspect a sample evidence trail. What were the original questions? Which providers produced the answers? What source provenance is real rather than inferred? What counts as a recommendation? Are failures preserved? Can I compare observations before and after an actual intervention?

I would also ask what business outcome has *not* been established. A higher mention frequency does not automatically mean more leads, sales or bookings. Those effects require separate measurement.

This is the discipline we are exploring with [Promptence](https://promptence.tech/), an early-stage product initiative at Margaryan Labs. We have published a dated, narrow visibility baseline for Promptence itself. It is a starting point for testing the method, **not** a verified customer-success story and **not** evidence of revenue growth.

The next generation of AI discovery tools will need more than polished dashboards. It will need a willingness to preserve inconvenient results, separate observations from explanations, and demonstrate change without rewriting the baseline.

---

**About the author.** Arman Margaryan is the founder of Margaryan Labs, an independently developed AI technology initiative. Current projects include Promptence and VETO Intelligence. Margaryan Labs is early-stage; the projects described here do not claim paying-customer outcomes or independently validated scientific breakthroughs.

**Disclosure.** This independent article was prepared with AI assistance at the author's direction. It is published by Margaryan Labs on its own GitHub repository, not as independently commissioned editorial coverage.

**Product:** https://promptence.tech/  
**Contact:** margaryanlabs@gmail.com