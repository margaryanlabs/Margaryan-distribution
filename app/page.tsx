"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { ContentDraft, DashboardSnapshot, DistributionActionRecord, Language, Lead, MissionRecord } from "@/lib/types";

type Runtime = { storage: string; persistence: string; execution: string };
type StateResponse = DashboardSnapshot & { runtime: Runtime };
type Provider = { id: string; name: string; configured: boolean; capability: string };
type ConnectionsResponse = { executionEnabled: boolean; providers: Provider[] };

const defaultGoal = "Sell Hay Engine to US dental clinics and run a 14-day content + outbound campaign.";

function shortDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function statusTone(status: string) {
  if (["succeeded", "approved", "active"].includes(status)) return "good";
  if (["failed", "blocked", "rejected"].includes(status)) return "bad";
  return "wait";
}

export default function Home() {
  const [goal, setGoal] = useState(defaultGoal);
  const [market, setMarket] = useState("United States");
  const [language, setLanguage] = useState<Language>("en");
  const [autonomy, setAutonomy] = useState<"auto" | "approve" | "draft">("approve");
  const [state, setState] = useState<StateResponse | null>(null);
  const [connections, setConnections] = useState<ConnectionsResponse | null>(null);
  const [selectedMission, setSelectedMission] = useState<MissionRecord | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("No database attached. V0.2 is running in safe in-memory mode.");

  async function refresh() {
    const [stateRes, connectionRes] = await Promise.all([
      fetch("/api/state", { cache: "no-store" }),
      fetch("/api/connections", { cache: "no-store" })
    ]);
    const nextState = await stateRes.json() as StateResponse;
    const nextConnections = await connectionRes.json() as ConnectionsResponse;
    setState(nextState);
    setConnections(nextConnections);
    if (!selectedMission && nextState.missions[0]) setSelectedMission(nextState.missions[0]);
  }

  useEffect(() => { void refresh(); }, []);

  const actions = useMemo(() => {
    if (!state) return [];
    if (!selectedMission) return state.actions;
    return state.actions.filter((action) => action.missionId === selectedMission.id);
  }, [state, selectedMission]);

  const leads = useMemo(() => {
    if (!state) return [];
    if (!selectedMission) return state.leads;
    return state.leads.filter((lead) => !lead.missionId || lead.missionId === selectedMission.id);
  }, [state, selectedMission]);

  const content = useMemo(() => {
    if (!state) return [];
    if (!selectedMission) return state.content;
    return state.content.filter((draft) => !draft.missionId || draft.missionId === selectedMission.id);
  }, [state, selectedMission]);

  async function createMission() {
    setBusy("mission");
    setNotice("Agent is turning the command into a governed distribution plan…");
    try {
      const res = await fetch("/api/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, market, language, autonomy })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Mission creation failed");
      setSelectedMission(data.mission as MissionRecord);
      setNotice(`Mission created: ${data.mission.plan.missionName}. ${data.actions.length} actions queued.`);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Mission creation failed");
    } finally {
      setBusy(null);
    }
  }

  async function actionCommand(action: DistributionActionRecord, command: "approve" | "reject" | "execute") {
    setBusy(`${command}:${action.recordId}`);
    try {
      const res = await fetch(`/api/actions/${action.recordId}/${command}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `${command} failed`);
      setNotice(command === "execute" ? `Executed ${action.channel}/${action.kind} (${connections?.executionEnabled ? "LIVE" : "DRY-RUN"}).` : `${command}d action: ${action.objective}`);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : `${command} failed`);
    } finally {
      setBusy(null);
    }
  }

  async function researchLeads() {
    if (!selectedMission) { setNotice("Launch or select a mission first."); return; }
    setBusy("research");
    setNotice("Research agent is searching the public web for high-fit businesses…");
    try {
      const res = await fetch("/api/research/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionId: selectedMission.id, limit: 8 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lead research failed");
      setNotice(`Research completed: ${data.researched} reviewed, ${data.added} new leads added.`);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Lead research failed");
    } finally {
      setBusy(null);
    }
  }

  async function generateContent() {
    setBusy("content");
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: selectedMission?.input.goal || goal, language, missionId: selectedMission?.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Content generation failed");
      setNotice(`Created ${data.drafts.length} channel-native content drafts.`);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Content generation failed");
    } finally {
      setBusy(null);
    }
  }

  async function tickWorker() {
    setBusy("worker");
    try {
      const res = await fetch("/api/worker/tick", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Worker failed");
      setNotice(`Worker processed ${data.processed} due action(s).`);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Worker failed");
    } finally {
      setBusy(null);
    }
  }

  const stats = state?.stats ?? { activeMissions: 0, queuedActions: 0, approvalsNeeded: 0, completedActions: 0, researchedLeads: 0 };

  return (
    <main className="appShell">
      <aside className="sideRail">
        <div className="brandMark"><span>M</span><div><b>MARGARYAN</b><small>DISTRIBUTION</small></div></div>
        <nav>
          <a className="active" href="#command">Command</a>
          <a href="#missions">Missions</a>
          <a href="#leads">Leads <em>{stats.researchedLeads}</em></a>
          <a href="#approvals">Approvals <em>{stats.approvalsNeeded}</em></a>
          <a href="#content">Content</a>
          <a href="#connections">Connections</a>
          <a href="#runtime">Runtime</a>
        </nav>
        <div className="railFoot">
          <span className={`liveDot ${connections?.executionEnabled ? "on" : ""}`}/>
          <div><b>{connections?.executionEnabled ? "LIVE EXECUTION" : "DRY-RUN"}</b><small>{state?.runtime.storage || "memory"} storage</small></div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><span className="eyebrow">AUTONOMOUS DISTRIBUTION WORKFORCE</span><h1>Command Center</h1></div>
          <button className="ghost" onClick={tickWorker} disabled={busy === "worker"}>{busy === "worker" ? "Running…" : "Run worker"}</button>
        </header>

        <div className="notice"><span/> {notice}</div>

        <section id="command" className="commandCard">
          <div className="commandIntro"><span>MISSION INPUT</span><h2>Give the agent a job.</h2><p>It plans the channel mix, creates actions, requests approval where needed, executes through official providers, then summarizes what happened.</p></div>
          <textarea value={goal} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setGoal(event.target.value)} />
          <div className="commandControls">
            <label><span>MARKET</span><input value={market} onChange={(event: ChangeEvent<HTMLInputElement>) => setMarket(event.target.value)} /></label>
            <label><span>LANGUAGE</span><select value={language} onChange={(event: ChangeEvent<HTMLSelectElement>) => setLanguage(event.target.value as Language)}><option value="en">English</option><option value="ru">Russian</option></select></label>
            <label><span>AUTONOMY</span><select value={autonomy} onChange={(event: ChangeEvent<HTMLSelectElement>) => setAutonomy(event.target.value as "auto" | "approve" | "draft")}><option value="approve">Approve sensitive</option><option value="auto">Auto where allowed</option><option value="draft">Draft only</option></select></label>
            <button onClick={createMission} disabled={busy === "mission"}>{busy === "mission" ? "Planning…" : "Launch mission →"}</button>
          </div>
        </section>

        <section className="metricRow">
          <article><span>ACTIVE MISSIONS</span><strong>{stats.activeMissions}</strong><small>agent jobs in memory</small></article>
          <article><span>RESEARCHED LEADS</span><strong>{stats.researchedLeads}</strong><small>public-web business research</small></article>
          <article><span>ACTION QUEUE</span><strong>{stats.queuedActions}</strong><small>scheduled + approved</small></article>
          <article><span>NEEDS APPROVAL</span><strong>{stats.approvalsNeeded}</strong><small>reputation-sensitive</small></article>
          <article><span>EXECUTED</span><strong>{stats.completedActions}</strong><small>{connections?.executionEnabled ? "provider actions" : "safe simulations"}</small></article>
        </section>

        <section id="missions" className="splitGrid">
          <div className="panel missionPanel">
            <div className="panelHead"><div><span>MISSIONS</span><h3>Agent workstreams</h3></div><b>{state?.missions.length || 0}</b></div>
            <div className="missionList">
              {(state?.missions || []).length === 0 && <div className="empty">No missions yet. Launch the first command above.</div>}
              {(state?.missions || []).map((mission) => (
                <button key={mission.id} className={`missionItem ${selectedMission?.id === mission.id ? "selected" : ""}`} onClick={() => setSelectedMission(mission)}>
                  <div><strong>{mission.plan.missionName}</strong><p>{mission.input.goal}</p></div>
                  <span className={`pill ${statusTone(mission.status)}`}>{mission.status}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="panel planPanel">
            <div className="panelHead"><div><span>AGENT THESIS</span><h3>{selectedMission?.plan.missionName || "No active mission"}</h3></div><span className="muted">{selectedMission ? shortDate(selectedMission.createdAt) : "—"}</span></div>
            {selectedMission ? <>
              <p className="thesis">{selectedMission.plan.thesis}</p>
              <div className="tagBlock"><span>AUDIENCE</span><div>{selectedMission.plan.audience.map((item) => <i key={item}>{item}</i>)}</div></div>
              <div className="tagBlock"><span>CONTENT PILLARS</span><div>{selectedMission.plan.contentPillars.map((item) => <i key={item}>{item}</i>)}</div></div>
            </> : <div className="empty">Mission strategy will appear here.</div>}
          </div>
        </section>

        <section id="leads" className="panel leadsPanel">
          <div className="panelHead"><div><span>RESEARCH AGENT</span><h3>Qualified account discovery</h3></div><button className="ghost" onClick={researchLeads} disabled={busy === "research" || !selectedMission}>{busy === "research" ? "Researching…" : "Research 8 leads"}</button></div>
          <div className="leadGrid">
            {leads.length === 0 && <div className="empty wide">No researched businesses yet. Research uses current public web information and stores only business-level lead data.</div>}
            {leads.slice(0, 12).map((lead: Lead) => <article key={lead.id}>
              <div className="leadTop"><span className="score">{Math.round(lead.score || 0)}</span><span className="pill wait">{lead.stage}</span></div>
              <h4>{lead.company}</h4>
              <p>{lead.fitReason || lead.research || "Research pending"}</p>
              <div className="leadMeta"><span>{lead.country || "—"}</span>{lead.website && <a href={lead.website} target="_blank" rel="noreferrer">Website ↗</a>}</div>
            </article>)}
          </div>
        </section>

        <section id="approvals" className="panel actionPanel">
          <div className="panelHead"><div><span>EXECUTION QUEUE</span><h3>Plan → gate → execute</h3></div><span className="muted">{actions.length} actions</span></div>
          <div className="actionTable">
            <div className="actionHeader"><span>CHANNEL</span><span>OBJECTIVE</span><span>SCHEDULE</span><span>STATE</span><span>ACTION</span></div>
            {actions.length === 0 && <div className="empty">No queued actions.</div>}
            {actions.map((action) => {
              const pending = busy?.endsWith(action.recordId);
              return <div className="actionRow" key={action.recordId}>
                <span className="channelBadge">{action.channel.toUpperCase()}</span>
                <div><strong>{action.objective}</strong><p>{action.rationale}</p></div>
                <span>{shortDate(action.scheduledAt)}</span>
                <span className={`pill ${statusTone(action.status)}`}>{action.mode} · {action.status}</span>
                <div className="rowButtons">
                  {action.mode === "APPROVE" && action.status === "queued" && <><button onClick={() => actionCommand(action, "approve")} disabled={pending}>Approve</button><button className="subtle" onClick={() => actionCommand(action, "reject")} disabled={pending}>Reject</button></>}
                  {action.mode === "AUTO" && ["queued", "approved", "failed"].includes(action.status) && <button onClick={() => actionCommand(action, "execute")} disabled={pending}>Execute</button>}
                  {["succeeded", "blocked", "rejected"].includes(action.status) && <span className="muted">{action.error || "Done"}</span>}
                </div>
              </div>;
            })}
          </div>
        </section>

        <section id="content" className="panel contentPanel">
          <div className="panelHead"><div><span>SMM ENGINE</span><h3>Channel-native content</h3></div><button className="ghost" onClick={generateContent} disabled={busy === "content"}>{busy === "content" ? "Generating…" : "Generate campaign pack"}</button></div>
          <div className="contentGrid">
            {content.length === 0 && <div className="empty wide">No content pack yet. Generate one from the current mission.</div>}
            {content.slice(0, 6).map((draft: ContentDraft) => <article key={draft.id}><div><span>{draft.channel.toUpperCase()}</span><em>{draft.status}</em></div><h4>{draft.title}</h4><p>{draft.body}</p>{draft.callToAction && <small>{draft.callToAction}</small>}</article>)}
          </div>
        </section>

        <section id="connections" className="panel connectionsPanel">
          <div className="panelHead"><div><span>CONNECTION CENTER</span><h3>Distribution network</h3></div><span className="muted">Official provider adapters</span></div>
          <div className="providerGrid">
            {(connections?.providers || []).map((provider) => <article key={provider.id}><div><i className={provider.configured ? "ready" : "off"}/><strong>{provider.name}</strong></div><p>{provider.capability}</p><span>{provider.configured ? "CONFIGURED" : "NOT CONNECTED"}</span></article>)}
          </div>
        </section>

        <section id="runtime" className="runtimeStrip">
          <div><span>STORAGE</span><b>MEMORY / NO DATABASE</b></div>
          <div><span>PERSISTENCE</span><b>PROCESS LIFETIME</b></div>
          <div><span>EXECUTION</span><b>{state?.runtime.execution?.toUpperCase() || "DRY-RUN"}</b></div>
          <div><span>NEXT BACKEND</span><b>SUPABASE ADAPTER LATER</b></div>
        </section>
      </section>
    </main>
  );
}
