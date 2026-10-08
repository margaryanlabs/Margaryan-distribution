"use client";

import { useEffect, useMemo, useState } from "react";
import type { Language, LinkedInAgentThread, Lead, ProductRecord } from "@/lib/types";
import styles from "./linkedin.module.css";

type Capability = { inboxReadAvailable: boolean; directMessageSendAvailable: boolean; durable: boolean; publishingTokenConfigured: boolean };
type State = { threads: LinkedInAgentThread[]; capability: Capability };

export default function LinkedInAgentPage() {
  const [threads, setThreads] = useState<LinkedInAgentThread[]>([]);
  const [capability, setCapability] = useState<Capability | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [activeId, setActiveId] = useState("");
  const [leadId, setLeadId] = useState("");
  const [productId, setProductId] = useState("");
  const [contactName, setContactName] = useState("");
  const [company, setCompany] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [latestInbound, setLatestInbound] = useState("");
  const [context, setContext] = useState("");
  const [notice, setNotice] = useState("LinkedIn DM access is NOT connected. Paste a message to analyze it; sending remains manual.");
  const [busy, setBusy] = useState(false);
  const active = useMemo(() => threads.find(t => t.id === activeId), [threads, activeId]);
  const positive = threads.filter(t => t.decision.intent === "positive" || t.decision.intent === "question").length;
  const queue = threads.filter(t => t.draftStatus === "pending_review" && Boolean(t.draftReply)).length;

  async function refresh() {
    const [r, s] = await Promise.all([fetch("/api/linkedin/agent", { cache: "no-store" }), fetch("/api/state", { cache: "no-store" })]);
    const data = await r.json() as State & { error?: string };
    if (!r.ok) throw new Error(data.error || "LinkedIn agent unavailable");
    setThreads(data.threads);
    setCapability(data.capability);
    if (s.ok) {
      const state = await s.json() as { leads: Lead[]; products: ProductRecord[] };
      setLeads(state.leads || []); setProducts(state.products || []);
    }
  }
  useEffect(() => { void refresh().catch(e => setNotice(e instanceof Error ? e.message : "Failed to load conversations")); }, []);
  function selectThread(id: string) {
    setActiveId(id);
    const t = threads.find(item => item.id === id);
    if (t) { setContactName(t.contactName); setCompany(t.company); setProfileUrl(t.profileUrl || ""); setLanguage(t.language); setLeadId(t.leadId || ""); setProductId(t.productId || ""); setLatestInbound(""); setContext(""); }
  }
  function startNew() {
    setActiveId(""); setLeadId(""); setProductId(""); setContactName(""); setCompany(""); setProfileUrl(""); setLatestInbound(""); setContext("");
  }
  async function analyze() {
    if (!latestInbound.trim() || (!active && !contactName.trim())) return;
    setBusy(true);
    try {
      const res = await fetch("/api/linkedin/agent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: activeId || undefined, importId: crypto.randomUUID(), leadId: leadId || undefined,
          productId: productId || undefined, contactName, company, profileUrl, latestInbound, context, language })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not analyze");
      await refresh();
      setActiveId(data.thread.id);
      setLatestInbound(""); setContext("");
      setNotice(data.thread.draftStatus === "blocked" ? "Stop contact: no reply drafted." : "Analysis saved. Review the proposed reply before sending it manually.");
    } catch (e) { setNotice(e instanceof Error ? e.message : "Analysis error"); }
    finally { setBusy(false); }
  }
  async function copyDraft() {
    if (!active?.draftReply) return;
    try { await navigator.clipboard.writeText(active.draftReply); setNotice("Draft copied. Open LinkedIn, send it yourself, then click 'I sent this'."); }
    catch { setNotice("Clipboard was denied. Select and copy the draft text manually."); }
  }
  async function markSent() {
    if (!active || !confirm("Confirm ONLY after you actually sent this exact draft on LinkedIn. This action does not send a message.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/linkedin/agent", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ threadId: active.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Confirmation failed");
      await refresh();
      setNotice("Recorded your manual send. No LinkedIn API send was attempted.");
    } catch (e) { setNotice(e instanceof Error ? e.message : "Confirmation failed"); }
    finally { setBusy(false); }
  }

  return <main className={styles.page}>
    <div className={styles.glow} aria-hidden="true" />
    <header className={styles.header}>
      <div><span className={styles.kicker}>MARGARYAN DISTRIBUTION / REVENUE INTELLIGENCE</span><h1>LinkedIn <em>Agent</em></h1>
        <p>Private conversation copilot. Understand inbound messages, identify buying intent and prepare factual replies.</p></div>
      <div className={styles.status}><span className={styles.statusDot} /><strong>ASSISTED MODE</strong><small>No direct LinkedIn DM access</small></div>
    </header>
    <section className={styles.metrics} aria-label="LinkedIn agent metrics">
      <div><small>TRACKED CONVERSATIONS</small><strong>{threads.length}</strong><span>Operator-imported only</span></div>
      <div><small>WARM / QUESTION</small><strong>{positive}</strong><span>Observed in imported messages</span></div>
      <div><small>REPLIES TO REVIEW</small><strong>{queue}</strong><span>Never auto-sent</span></div>
      <div><small>DURABLE MEMORY</small><strong>{capability?.durable ? "READY" : "OFF"}</strong><span>{capability?.durable ? "CRM checkpoint" : "Required to import"}</span></div>
    </section>
    <div className={styles.notice} role="status"><b>OPERATING BOUNDARY</b><span>{notice}</span></div>
    <section className={styles.workspace}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHead}><div><small>CONVERSATION QUEUE</small><h2>Messages</h2></div><button onClick={startNew}>+ New</button></div>
        <div className={styles.threadList}>
          {threads.length === 0 && <div className={styles.empty}>No conversation imported. Paste the latest incoming message using the editor.</div>}
          {threads.map(t => <button className={t.id === activeId ? styles.selectedThread : styles.thread} key={t.id} onClick={() => selectThread(t.id)}>
            <span className={styles.avatar}>{(t.contactName || "?").slice(0, 1).toUpperCase()}</span>
            <span className={styles.threadText}><strong>{t.contactName}</strong><small>{t.company || "Company not set"}</small><small>{t.decision.summary.slice(0, 80)}</small></span>
            <span className={styles.threadMeta}><i className={t.decision.intent === "positive" || t.decision.intent === "question" ? styles.warm : styles.neutral} />{t.draftStatus === "blocked" ? "STOP" : t.draftStatus === "confirmed_sent" ? "SENT*" : "REVIEW"}</span>
          </button>)}
        </div>
        <p className={styles.disclaimer}>* Sent means you confirmed sending it yourself. This agent cannot read, scrape, or send private LinkedIn DMs.</p>
      </aside>
      <div className={styles.main}>
        <div className={styles.sectionTitle}><div><small>01 / IMPORT A REAL MESSAGE</small><h2>{active ? "Continue conversation" : "Start a conversation"}</h2></div><a href="https://www.linkedin.com/messaging/" target="_blank" rel="noopener noreferrer">Open LinkedIn ↗</a></div>
        <div className={styles.inputGrid}>
          <label>Known CRM lead (optional)<select value={leadId} onChange={e => { const id=e.target.value;setLeadId(id); const lead=leads.find(l=>l.id===id); if(lead&&!active){ setContactName(lead.contactName||"");setCompany(lead.company);setProfileUrl(lead.linkedinUrl||"");setLanguage(lead.language); } }} disabled={Boolean(active)}><option value="">Not in CRM</option>{leads.map(l=><option key={l.id} value={l.id}>{l.contactName ? l.contactName+" · " : ""}{l.company}</option>)}</select></label>
          <label>Product context<select value={productId} onChange={e=>setProductId(e.target.value)} disabled={Boolean(active)}><option value="">General, no product claims</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label>Contact name<input value={contactName} onChange={e=>setContactName(e.target.value)} placeholder="e.g. Alex Morgan" disabled={Boolean(active)} maxLength={200} /></label>
          <label>Company<input value={company} onChange={e=>setCompany(e.target.value)} placeholder="e.g. Example Real Estate" disabled={Boolean(active)} maxLength={200} /></label>
          <label>LinkedIn profile / chat URL<input value={profileUrl} onChange={e=>setProfileUrl(e.target.value)} placeholder="https://www.linkedin.com/in/..." disabled={Boolean(active)} maxLength={1000} /></label>
          <label>Reply language<select value={language} onChange={e=>setLanguage(e.target.value as Language)} disabled={Boolean(active)}><option value="en">English</option><option value="ru">Русский</option></select></label>
        </div>
        <label className={styles.textLabel}>Latest incoming LinkedIn message <span>required</span><textarea value={latestInbound} onChange={e=>setLatestInbound(e.target.value)} placeholder="Paste the actual latest message from the person. The agent cannot retrieve it for you." maxLength={12000}/></label>
        <label className={styles.textLabel}>Earlier conversation context <span>optional</span><textarea className={styles.context} value={context} onChange={e=>setContext(e.target.value)} placeholder="Paste relevant previous turns so the reply stays consistent. Clearly label who said what." maxLength={12000}/></label>
        <div className={styles.controlRow}><small>Human approval required · No browser automation · No mass messaging</small><button className={styles.primary} onClick={()=>void analyze()} disabled={busy || !latestInbound.trim() || (!active && !contactName.trim()) || capability?.durable === false}>{busy ? "Analyzing…" : "Analyze & draft reply →"}</button></div>
        {active && <div className={styles.result}>
          <div className={styles.sectionTitle}><div><small>02 / DECISION INTELLIGENCE</small><h2>Conversation analysis</h2></div><span className={styles.intent}>{active.decision.intent.toUpperCase()}</span></div>
          <p className={styles.summary}>{active.decision.summary}</p>
          <div className={styles.resultMeta}><span>Next action <b>{active.decision.recommendedAction}</b></span><span>Urgency <b>{active.decision.urgency}</b></span><span>Review status <b>{active.draftStatus.replaceAll("_", " ")}</b></span></div>
          <div className={styles.draftHead}><small>03 / HUMAN-REVIEWED DRAFT</small><strong>{active.draftStatus === "blocked" ? "Contact stopped" : "Suggested LinkedIn response"}</strong></div>
          {active.draftReply ? <><textarea readOnly value={active.draftReply} className={styles.draft} aria-label="AI prepared LinkedIn reply"/>
            <div className={styles.controlRow}><small>Copy ≠ send. Only you can confirm an actual send.</small><div className={styles.actions}><button onClick={()=>void copyDraft()}>Copy reply</button><a href={active.profileUrl || "https://www.linkedin.com/messaging/"} target="_blank" rel="noopener noreferrer">Open conversation ↗</a><button className={styles.primary} disabled={busy || active.draftStatus !== "pending_review"} onClick={()=>void markSent()}>{active.draftStatus === "confirmed_sent" ? "✓ Confirmed sent" : "I sent this"}</button></div></div>
          </> : <div className={styles.empty}>No message drafted. Respect the recipient's decision or review manually.</div>}
          <div className={styles.history}><small>OPERATOR-RECORDED MESSAGE HISTORY</small>{active.messages.map(m=><div key={m.id} className={m.direction==="inbound"?styles.inbound:styles.outbound}><b>{m.direction==="inbound"?"INBOUND · PASTED":"OUTBOUND · SELF-CONFIRMED"}</b><span>{m.text}</span><time>{new Date(m.at).toLocaleString()}</time></div>)}</div>
        </div>}
      </div>
    </section>
  </main>;
}
