"use client";

import { useState } from "react";

const channels = [
  ["GMAIL", "Sales outreach, replies, follow-up", "ready"],
  ["X", "Posts, launch threads, replies", "ready"],
  ["LINKEDIN", "Posts through approved official access", "gate"],
  ["INSTAGRAM", "Professional-account publishing", "gate"],
  ["VOICE", "Twilio + OpenAI Realtime qualification", "gate"],
  ["MEMORY", "CRM, transcripts, summaries, next action", "ready"]
] as const;

const activity = [
  ["PLAN", "Campaign brain", "Research → SMM → outbound → qualification → handoff", "AUTO"],
  ["EMAIL", "Gmail executor", "Personalized first touch and reply loop", "APPROVE"],
  ["SOCIAL", "Content engine", "Channel-native X / LinkedIn / Instagram variants", "APPROVE"],
  ["VOICE", "Realtime closer", "Warm-lead qualification with post-call brief", "BLOCKED"]
] as const;

export default function Home() {
  const [goal, setGoal] = useState("Sell Hay Engine to US dental clinics and run a 14-day content + outbound campaign.");
  const [market, setMarket] = useState("United States");
  const [language, setLanguage] = useState("en");
  const [autonomy, setAutonomy] = useState("approve");
  const [result, setResult] = useState("Give the agent a goal and build the first distribution mission.");
  const [busy, setBusy] = useState(false);

  async function buildMission() {
    setBusy(true);
    setResult("Building mission…");
    try {
      const res = await fetch("/api/agent/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, market, language, autonomy })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Planner failed");
      setResult(JSON.stringify(data.plan, null, 2));
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Planner failed");
    } finally {
      setBusy(false);
    }
  }

  return <main className="shell">
    <header>
      <div><span className="eyebrow">MARGARYAN LABS / DISTRIBUTION OS</span><h1>Distribution<br/>Command</h1><p>One goal in. Research, sales, SMM, calls, follow-up and reporting out.</p></div>
      <div className="status"><i/> GOVERNED AUTONOMY</div>
    </header>

    <section className="command commandBox">
      <div className="commandMain">
        <span>MISSION</span>
        <textarea value={goal} onChange={(e)=>setGoal(e.target.value)} />
        <div className="controls">
          <label>Market<input value={market} onChange={(e)=>setMarket(e.target.value)} /></label>
          <label>Language<select value={language} onChange={(e)=>setLanguage(e.target.value)}><option value="en">English</option><option value="ru">Russian</option></select></label>
          <label>Autonomy<select value={autonomy} onChange={(e)=>setAutonomy(e.target.value)}><option value="approve">Approve sensitive actions</option><option value="auto">Auto where allowed</option><option value="draft">Draft only</option></select></label>
        </div>
      </div>
      <button disabled={busy} onClick={buildMission}>{busy ? "Planning…" : "Build mission"}</button>
    </section>

    <section className="grid metrics">
      <article><span>Operating loop</span><strong>10</strong><small>steps from command to learn</small></article>
      <article><span>Channels</span><strong>5+</strong><small>official executor adapters</small></article>
      <article><span>Languages</span><strong>EN/RU</strong><small>voice + written distribution</small></article>
      <article><span>Runtime</span><strong>24/7</strong><small>worker-ready architecture</small></article>
    </section>

    <section className="two">
      <div className="panel"><div className="panelHead"><h2>Execution system</h2><span>PLAN → GATE → EXECUTE</span></div>{activity.map(([icon,name,desc,mode])=><div className="row" key={name}><b>{icon}</b><div><strong>{name}</strong><p>{desc}</p></div><em className={`mode ${mode.toLowerCase()}`}>{mode}</em></div>)}</div>
      <div className="panel"><div className="panelHead"><h2>Distribution network</h2><span>OFFICIAL APIS</span></div><div className="channelGrid">{channels.map(([name,desc,state])=><div className="channel" key={name}><div><strong>{name}</strong><i className={state}/></div><p>{desc}</p></div>)}</div></div>
    </section>

    <section className="panel planner"><div className="panelHead"><h2>Agent plan</h2><span>STRUCTURED OUTPUT</span></div><pre>{result}</pre></section>
    <section className="footerNote"><span>COMMAND → PLAN → QUEUE → POLICY → APPROVAL → EXECUTE → OBSERVE → SUMMARIZE → LEARN → NEXT ACTION</span></section>
  </main>;
}
