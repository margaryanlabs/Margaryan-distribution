/* ATLAS OS v0.1 — private-first, local editable workspace.
 * Imported editorial stages are NOT verified development statuses.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "margaryan-atlas-workspace-v1";
  var seed = window.ATLAS_SEED || {projects:[],repositories:[],source:{}};
  var engine = window.ATLAS_ENGINE;
  var app = document.getElementById("app");
  var dialog = document.getElementById("editor");
  var form = document.getElementById("editor-form");
  var fields = document.getElementById("editor-fields");
  var toastNode = document.getElementById("toast");
  var activeForm = null, toastTimer = null, focusCandidateId = null, editingRecord = null;
  var view = "overview", selectedId = null, activeTab = "overview", query = "", stageFilter = "all";
  var store = loadStore();

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function escapeHtml(value) { return String(value == null ? "" : value).replace(/[&<>"']/g, function (s) { return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[s]; }); }
  function safeUrl(url) { try { var parsed = new URL(url); return /^https?:$/.test(parsed.protocol) ? parsed.href : ""; } catch (_) { return ""; } }
  function uid() { return "r-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,8); }
  function today() {
    var parts=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Yerevan",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
    var date={};parts.forEach(function(x){if(x.type!=="literal")date[x.type]=x.value;});
    return date.year+"-"+date.month+"-"+date.day;
  }
  function money(n) { return new Intl.NumberFormat("ru-RU",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(n); }
  function stageName(s) { return {"Operating":"Эксплуатация*","Private beta":"Закрытая бета*","Building":"Разработка*","Prototype":"Прототип*","Research":"Исследование*","Internal":"Внутренний*","Applied build":"Клиентская работа*","Concept":"Идея","Archive":"Архив","Planned":"Планируем"}[s] || "Не указан"; }
  function kindName(type) { return {task:"Задача",bug:"Ошибка",expense:"Расход",event:"Запись",decision:"Решение",integration:"Сервис",note:"Заметка"}[type] || "Запись"; }
  function isArray(x) { return Array.isArray(x); }
  function hasText(x) { return typeof x === "string" && x.trim().length > 0; }
  function normalizeStore(data) {
    // One-way GitHub seed import: preserve user edits, merge new immutable records by stable IDs.
    // Tombstones keep locally deleted seed records from reappearing on the next reload.
    var collections=["tasks","bugs","expenses","integrations","events","decisions","notes"];
    if(!isArray(data.deletedRecordIds))data.deletedRecordIds=[];
    var deleted=new Set(data.deletedRecordIds);
    var existing=new Map(data.projects.map(function(p){return [p.id,p];}));
    (seed.projects||[]).forEach(function(remote){
      var local=existing.get(remote.id);
      if(!local){var fresh=clone(remote);data.projects.push(fresh);existing.set(fresh.id,fresh);return;}
      collections.forEach(function(key){
        if(!isArray(local[key]))local[key]=[];
        var known=new Set(local[key].map(function(r){return r.id;}));
        (remote[key]||[]).forEach(function(record){
          if(record&&record.id&&!known.has(record.id)&&!deleted.has(record.id)){
            local[key].push(clone(record));known.add(record.id);
          }
        });
      });
      if(!isArray(local.repositories))local.repositories=[];
      (remote.repositories||[]).forEach(function(r){if(!local.repositories.includes(r))local.repositories.push(r);});
      // Never overwrite local name, decision, kind, task status, evaluation or nextAction.
    });
    var seenRepos=new Set(data.repositories.map(function(r){return r.fullName;}));
    (seed.repositories||[]).forEach(function(r){
      if(!seenRepos.has(r.fullName)){data.repositories.push(clone(r));seenRepos.add(r.fullName);}
    });
    data.projects.forEach(function(p){
      if(p.kind!=="idea"&&p.kind!=="project")p.kind=(p.stage==="Concept"&&!(p.repositories||[]).length)?"idea":"project";
      if(p.kind==="idea"&&!p.ideaStatus)p.ideaStatus="inbox";
      if(p.kind==="project")p.ideaStatus=null;
      collections.forEach(function(key){if(!isArray(p[key]))p[key]=[];});
    });
    if(!data.focusDays||typeof data.focusDays!=="object"||Array.isArray(data.focusDays))data.focusDays={};
    data.version=2;
    return data;
  }
  function loadStore() {
    try {
      var raw=localStorage.getItem(STORAGE_KEY);
      if(raw) {
        var saved=JSON.parse(raw);
        if(saved && (saved.version===1||saved.version===2) && isArray(saved.projects) && isArray(saved.repositories)){
          var normalized=normalizeStore(saved);
          try{localStorage.setItem(STORAGE_KEY,JSON.stringify(normalized));}catch(_){ /* keep data in memory when storage is unavailable */ }
          return normalized;
        }
      }
    } catch(err){console.warn("ATLAS: local storage unavailable",err);}
    return normalizeStore(clone({version:2,createdAt:today(),projects:seed.projects||[],repositories:seed.repositories||[],source:seed.source||{},focusDays:{}}));
  }
  function isProject(p){return p.kind==="project";}
  function isIdea(p){return p.kind==="idea";}
  function focusDay(){return store.focusDays[today()]||null;}
  function ideaStatusName(s){return ({inbox:"На рассмотрении",shortlist:"В шортлисте",hold:"Отложена",rejected:"Отклонена"})[s]||"На рассмотрении";}
  function persist() {
    try { localStorage.setItem(STORAGE_KEY,JSON.stringify(store)); return true; }
    catch (err) { notify("Не удалось сохранить в браузере. Экспортируй резервную копию."); return false; }
  }
  function notify(message) {
    toastNode.textContent = message;
    toastNode.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {toastNode.classList.remove("show");},3500);
  }
  function project() { return store.projects.find(function (p) {return p.id === selectedId;}) || null; }
  function initials(name) {return (String(name).trim().split(/[\s-]+/).slice(0,2).map(function(x){return x[0]||"";}).join("").slice(0,2)||"A").toUpperCase();}
  function countRecords(key, predicate) { return store.projects.reduce(function(n,p){return n + (p[key] || []).filter(predicate || function(){return true;}).length;},0); }
  function allProjects() {
    var list=store.projects.filter(function(p){
      if(view==="ideas" && !isIdea(p))return false;
      if((view==="projects" || view==="overview") && !isProject(p))return false;
      if(stageFilter.indexOf("idea:")===0 && p.ideaStatus!==stageFilter.slice(5))return false;
      if(stageFilter!=="all" && stageFilter.indexOf("idea:")!==0 && p.stage!==stageFilter)return false;
      var search=[p.name,p.summary,p.alias,p.category,p.previousName,(p.repositories||[]).join(" ")].join(" ").toLowerCase();
      return search.includes(query.toLowerCase());
    });
    return list.sort(function(a,b){
      var ar=(a.ideaStatus==="shortlist"?3:0)+(a.nextAction?2:0)+(a.updatedAt?1:0);
      var br=(b.ideaStatus==="shortlist"?3:0)+(b.nextAction?2:0)+(b.updatedAt?1:0);
      return br-ar||String(a.name).localeCompare(String(b.name),"ru");
    });
  }
  function sidebarButton(target,symbol,title,count) {return '<button class="nav-btn '+(view===target&&!selectedId?'active':'')+'" data-action="nav" data-view="'+target+'"><span class="nav-icon">'+symbol+'</span>'+title+(count!=null?'<span class="nav-counter">'+count+'</span>':'')+'</button>';}
  function shell(inner) {
    return '<div class="layout"><aside class="sidebar"><div class="brand"><div class="brand-mark">A</div><div><div class="brand-title">ATLAS</div><div class="brand-sub">PROJECT COMMAND</div></div></div><nav aria-label="Основная навигация"><div class="nav-label">Рабочее пространство</div>'+
      sidebarButton("overview","◫","Обзор",null)+sidebarButton("today","◎","Проект дня",null)+sidebarButton("projects","▦","Проекты",store.projects.filter(isProject).length)+sidebarButton("ideas","✧","Идеи",store.projects.filter(isIdea).length)+sidebarButton("attention","◈","Внимание",null)+sidebarButton("finance","＄","Расходы",null)+sidebarButton("repositories","⌘","GitHub",store.repositories.length)+
      '</nav><div class="sidebar-foot"><strong>Локальное хранилище</strong>Данные сохраняются в этом браузере. Синхронизация с GitHub пока только в виде импортированного снимка.<br><code>v0.3 · без облачной авторизации</code></div></aside><main class="main"><div class="topbar"><span class="eyebrow">Margaryan Labs / Private workspace</span><div class="top-actions"><button class="btn ghost" data-action="export">↓ Экспорт</button><button class="btn ghost" data-action="import">↑ Импорт</button><button class="btn primary" data-action="new-project">+ Новая идея</button></div></div>'+inner+'<div class="footer">'+(seed.previewMode?'ПУБЛИЧНОЕ ДЕМО · Все исходные данные демонстрационные · Изменения хранятся только в этом браузере.':'ATLAS v0.3 · Статусы из каталога помечены * и не являются доказательством работы в production. Данные локальны.')+'</div></main></div>';
  }
  function statsBlock() {
    var projects=store.projects.filter(isProject).length,ideas=store.projects.filter(isIdea).length;
    var openBugs=countRecords("bugs",function(b){return b.status!=="resolved";});
    return '<div class="stats"><div class="stat"><div class="stat-label">Проекты</div><div class="stat-number">'+projects+'</div><div class="stat-desc">Решили реализовать</div></div>'+
      '<div class="stat"><div class="stat-label">Идеи</div><div class="stat-number">'+ideas+'</div><div class="stat-desc">Пока не в разработке</div></div>'+
      '<div class="stat"><div class="stat-label">Репозитории</div><div class="stat-number">'+store.repositories.length+'</div><div class="stat-desc">Снимок GitHub</div></div>'+
      '<div class="stat"><div class="stat-label">Зафиксированные баги</div><div class="stat-number">'+openBugs+'</div><div class="stat-desc">Не полный аудит</div></div></div>';
  }
  function projectCard(p) {
    var risk=engine.riskSummary(p),progress=engine.trackedProgress(p),score=isIdea(p)?engine.ideaScore(p):null;
    var summary=isIdea(p)?(score?"Оценка идеи: "+score.score+"/100 · вручную":"Идея без оценки"):
      (progress.percent===null?"Прогресс не оценён":progress.done+"/"+progress.tracked+" учтённых задач закрыто");
    return '<article tabindex="0" role="button" aria-label="Открыть '+escapeHtml(p.name)+'" class="project-card" data-action="open-project" data-id="'+escapeHtml(p.id)+'">'+
      '<div class="project-top"><div class="project-initials">'+escapeHtml(initials(p.name))+'</div><span class="pill '+(risk.criticalBugs?"error":"")+'">'+escapeHtml(isIdea(p)?ideaStatusName(p.ideaStatus):stageName(p.stage))+'</span></div>'+
      '<h3>'+escapeHtml(p.name)+'</h3><p class="project-desc">'+escapeHtml(p.summary || "Описание ещё не добавлено")+'</p>'+
      '<div class="card-measure"><span>'+escapeHtml(summary)+'</span>'+(risk.attention?'<span class="pill warning">'+risk.attention+' проблем</span>':'')+'</div>'+
      '<div class="project-foot"><span>'+escapeHtml(p.category||"Без категории")+'</span><span>'+(p.repositories||[]).length+' repo</span></div></article>';
  }
  function listing() {
    var items = allProjects();
    return '<div class="toolbar"><input class="search" id="project-search" type="search" autocomplete="off" placeholder="Поиск по названию, технологии или репозиторию…" value="'+escapeHtml(query)+'" aria-label="Поиск проектов"><select class="filter" id="stage-filter" aria-label="Этап проекта">'+
      (view==="ideas"?[['all','Все идеи'],['idea:inbox','На рассмотрении'],['idea:shortlist','В шортлисте'],['idea:hold','Отложены'],['idea:rejected','Отклонены']]:[['all','Все этапы'],['Planned','Планируются'],['Operating','Эксплуатация*'],['Building','Разработка*'],['Prototype','Прототип*'],['Research','Исследование*'],['Private beta','Закрытая бета*'],['Applied build','Клиентские*'],['Internal','Внутренние*'],['Archive','Архив']]).map(function(s){return '<option value="'+escapeHtml(s[0])+'" '+(stageFilter===s[0]?'selected':'')+'>'+escapeHtml(s[1])+'</option>';}).join("")+'</select></div>'+
      (items.length?'<div class="projects">'+items.map(projectCard).join("")+'</div>':'<div class="empty">Ничего не найдено. Измени фильтры или добавь новую идею.</div>');
  }
  function todayView(compact) {
    var day=focusDay(),p=day?store.projects.find(function(x){return x.id===day.projectId;}):null;
    var prior=Object.keys(store.focusDays||{}).sort().reverse().slice(0,8);
    var current=day&&p?'<section class="focus"><div><span class="pill '+(day.status==="closed"?"good":"")+'">'+(day.status==="closed"?"День закрыт":"В работе сегодня")+' · '+escapeHtml(today())+'</span><h2>'+escapeHtml(p.name)+'</h2><p><b>Цель:</b> '+escapeHtml(day.goal)+'</p>'+(day.result?'<p><b>Итог:</b> '+escapeHtml(day.result)+'</p>':"")+
      (day.nextStep?'<p><b>Следующий шаг:</b> '+escapeHtml(day.nextStep)+'</p>':"")+'</div><div class="grid-actions"><button class="btn" data-action="open-project" data-id="'+escapeHtml(p.id)+'">Открыть проект</button>'+(day.status==="active"?'<button class="btn primary" data-action="close-focus">Завершить день</button>':'')+'</div></section>':
      '<section class="focus"><div><span class="pill">Один день · один проект</span><h2>Проект дня ещё не выбран</h2><p>Выбери один проект и одну главную цель. Работа по другим идеям не размоет фокус.</p></div><button class="btn primary" data-action="start-focus">Выбрать проект дня</button></section>';
    if(compact)return current;
    var log=prior.map(function(date){var session=store.focusDays[date],item=store.projects.find(function(x){return x.id===session.projectId;});return '<div class="data-row"><div><b>'+escapeHtml(item?item.name:"Проект не найден")+'</b><div class="muted">'+escapeHtml(date)+' · '+escapeHtml(session.goal||"Без цели")+'</div>'+(session.result?'<div class="muted">Итог: '+escapeHtml(session.result)+'</div>':'')+'</div><span class="pill '+(session.status==="closed"?"good":"warning")+'">'+(session.status==="closed"?"Завершён":"В работе")+'</span></div>';}).join("");
    return '<div class="eyebrow">Daily focus / One project</div><h1>Один день. Один проект.</h1><p class="lead">Выбираем один проект на сегодняшний день. Фиксируем цель, результаты и следующий шаг. Завтра можно выбрать другой проект — или продолжить этот.</p>'+
      '<div class="section-head"><h2>Сегодня · '+escapeHtml(today())+'</h2></div>'+current+
      weeklyPanel()+'<div class="section-head"><h2>История работы</h2><span class="mini">Последние дни</span></div><section class="panel">'+(log||'<p class="muted">Первый рабочий день ещё не записан.</p>')+'</section>';
  }
  function ideasLead() {
    var shortlist=store.projects.filter(function(p){return isIdea(p)&&p.ideaStatus==="shortlist";});
    var scores=shortlist.map(function(p){return {idea:p,score:engine.ideaScore(p)};}).filter(function(x){return x.score;}).sort(function(a,b){return b.score.score-a.score.score;}).slice(0,3);
    var top=scores.length?'<section class="panel"><h3>Короткий список — субъективный рейтинг</h3><p class="hint">Оценка выставляется вручную по пяти факторам. Не прогноз доходности и не инвестиционная рекомендация.</p>'+
      scores.map(function(x,i){return '<div class="data-row"><div><b>'+(i+1)+'. '+escapeHtml(x.idea.name)+'</b><div class="muted">В шортлисте, сохранена как идея</div></div><button class="btn small" data-action="open-project" data-id="'+escapeHtml(x.idea.id)+'">'+x.score.score+'/100 →</button></div>';}).join("")+'</section>':
      '<div class="notice">Выбранные идеи появятся здесь после ручной оценки. Никаких выдуманных рейтингов.</div>';
    return '<div class="eyebrow">Idea vault / Selected concepts</div><h1>Идеи, не проекты.</h1><p class="lead">Обсудили идею → сохранили сюда. Сильные варианты попадают в шортлист. Решили реализовать — переводим в проекты отдельным действием.</p><div class="inline-actions"><span class="pill">'+shortlist.length+' в шортлисте</span><button class="btn primary" data-action="new-project">+ Записать идею</button></div>'+top;
  }
  function overview() {
    return (seed.previewMode?'<div class="notice"><b>Публичное демо ATLAS.</b> Здесь только демонстрационные записи, реальные приватные проекты и синхронизация GitHub не публикуются. Все твои действия сохраняются локально в браузере. Не вводи конфиденциальные данные.</div>':"")+'<div class="heading-row"><div><div class="eyebrow">Your laboratory · one source of truth</div><h1>Все идеи. Один контроль.</h1><p class="lead">Идеи отдельно, проекты отдельно. Каждый день выбираем один проект, работаем над одной целью и фиксируем реальный результат.</p></div><span class="stamp">Каталог: '+escapeHtml(store.source.snapshotDate||"без даты")+'</span></div>'+
      statsBlock()+'<div class="section-head"><div class="section-kicker">Главное сегодня</div><button class="clickable" data-action="nav" data-view="today">История работы →</button></div>'+todayView(true)+
      '<div class="section-head"><h2>Рабочие проекты</h2><button class="clickable" data-action="nav" data-view="ideas">Открыть идеи →</button></div>'+listing();
  }
  function links(p) { var arr=(p.repositories||[]).map(function(repo){var url=safeUrl("https://github.com/"+repo);return url?'<a class="pill link" href="'+escapeHtml(url)+'" target="_blank" rel="noopener noreferrer">⌘ '+escapeHtml(repo)+'</a>':'';}).join("");if(p.url && safeUrl(p.url))arr+='<a class="pill link" href="'+escapeHtml(safeUrl(p.url))+'" target="_blank" rel="noopener noreferrer">↗ Сайт</a>';return arr || '<span class="muted">Связей пока нет</span>';}
  function header(p) {
    var buttons='<div class="grid-actions"><button class="btn ghost" data-action="export-brief">↓ Паспорт MD</button><button class="btn" data-action="edit-project">✎ Редактировать</button></div>';
    if(isIdea(p))buttons='<div class="grid-actions"><button class="btn" data-action="idea-status" data-status="shortlist">☆ В шортлист</button><button class="btn primary" data-action="promote-idea">Превратить в проект →</button>'+buttons+'</div>';
    else if(!focusDay())buttons='<div class="grid-actions"><button class="btn primary" data-action="start-focus" data-id="'+escapeHtml(p.id)+'">◎ Проект дня</button>'+buttons+'</div>';
    return '<button class="back" data-action="go-home">← К '+(isIdea(p)?"идеям":"проектам")+'</button><div class="detail-head"><div><div class="eyebrow">'+escapeHtml(p.category||"Проект")+'</div><h1>'+escapeHtml(p.name)+'</h1><p class="detail-summary">'+escapeHtml(p.summary||"Описание ещё не заполнено.")+'</p><div class="meta-row"><span class="pill">'+(isIdea(p)?"Идея · "+escapeHtml(ideaStatusName(p.ideaStatus)):"Проект · "+escapeHtml(stageName(p.stage)))+'</span><span class="pill warning">Технический статус не проверен</span>'+(p.previousName?'<span class="pill">Ранее: '+escapeHtml(p.previousName)+'</span>':'')+'</div></div>'+buttons+'</div>'+
      (isIdea(p)?'<div class="panel"><h3>Отбор идеи</h3><p class="muted">Сравнивай варианты и переводите в проекты только после решения начать реализацию.</p><div class="inline-actions"><button class="btn small" data-action="idea-status" data-status="inbox">На рассмотрении</button><button class="btn small" data-action="idea-status" data-status="shortlist">В шортлист</button><button class="btn small" data-action="idea-status" data-status="hold">Отложить</button><button class="btn small" data-action="idea-status" data-status="rejected">Отклонить</button></div></div>':"");
  }
  function tabButton(tab,title,count) {return '<button class="tab '+(activeTab===tab?"active":"")+'" data-action="tab" data-tab="'+tab+'">'+title+(count!=null?' · '+count:'')+'</button>';}
  function tabs(p) {
    return '<nav class="tabs" aria-label="Разделы проекта">'+tabButton("overview","Обзор",null)+tabButton("notes","Заметки",(p.notes||[]).length)+tabButton("tasks","Задачи",(p.tasks||[]).length)+tabButton("bugs","Ошибки",(p.bugs||[]).length)+tabButton("expenses","Расходы",(p.expenses||[]).length)+tabButton("integrations","Сервисы",(p.integrations||[]).length)+tabButton("events","История",(p.events||[]).length)+tabButton("decisions","Решения",(p.decisions||[]).length)+'</nav>';
  }
  function action(type,label) {return '<button class="btn small" data-action="add-record" data-kind="'+type+'">+ '+label+'</button>';}
  function blank(label){return '<div class="empty">'+label+'</div>';}
  function recordRows(rows,kind) {
    if(!rows || !rows.length)return blank("Пока нет записей. Добавь первую — с датой, смыслом и источником.");
    return rows.slice().sort(function(a,b){return String(b.date||"").localeCompare(String(a.date||""));}).map(function(r){
      var sub=[], status="";
      if(kind==="tasks"){sub.push(r.status==="done"?"Выполнено (по отметке пользователя)":"Ожидает");if(r.priority)sub.push("Приоритет: "+r.priority);}
      if(kind==="bugs"){sub.push(r.status==="resolved"?"Исправлено по отметке":"Открыто");if(r.severity)sub.push("Критичность: "+r.severity);}
      if(kind==="expenses"){sub.push(money(Number(r.amount)||0));sub.push(r.frequency==="monthly"?"в месяц":"разово");sub.push(r.confidence==="actual"?"фактический":"оценка");}
      if(kind==="integrations"){sub.push(r.status==="connected"?"Подключено по отметке":r.status==="blocked"?"Заблокировано":"Планируется");}
      if(r.date)sub.push(r.date);
      if(r.note)sub.push(r.note);
      var check=kind==="tasks"?'<input type="checkbox" class="record-check" aria-label="Отметить выполнение задачи" data-action="toggle-task" data-id="'+escapeHtml(r.id)+'" '+(r.status==="done"?"checked":"")+'>':'<span class="dot '+(kind==="bugs"&&r.status!=="resolved"?"red":kind==="integrations"&&r.status==="connected"?"green":"")+'"></span>';
      var proof=r.evidence && safeUrl(r.evidence)?'<a class="link" target="_blank" rel="noopener noreferrer" href="'+escapeHtml(safeUrl(r.evidence))+'">Источник ↗</a>':"Без ссылки-доказательства";
      return '<div class="record">'+check+'<div class="record-main"><div class="record-title">'+escapeHtml(r.title||"Без названия")+'</div><div class="record-sub">'+escapeHtml(sub.join(" · "))+'</div><div class="record-sub">'+proof+'</div></div><div class="record-actions">'+
        ((kind==="bugs"&&r.status!=="resolved")?'<button class="btn small ghost" data-action="resolve-bug" data-id="'+escapeHtml(r.id)+'">✓</button>':'')+
        '<button class="icon-btn" style="font-size:14px" data-action="edit-record" data-kind="'+kind+'" data-id="'+escapeHtml(r.id)+'" aria-label="Редактировать запись">✎</button>'+
        '<button class="icon-btn" style="font-size:17px" data-action="delete-record" data-kind="'+kind+'" data-id="'+escapeHtml(r.id)+'" aria-label="Удалить запись">×</button></div></div>';
    }).join("");
  }
  function expensesTotal(p,frequency) {return (p.expenses||[]).filter(function(e){return e.frequency===frequency && e.confidence==="actual";}).reduce(function(s,e){return s+(Number(e.amount)||0);},0);}
  function detailsOverview(p) {
    var done=(p.tasks||[]).filter(function(t){return t.status==="done";}).length;
    var todo=(p.tasks||[]).length-done;
    var open=(p.bugs||[]).filter(function(b){return b.status!=="resolved";}).length;
    var connected=(p.integrations||[]).filter(function(s){return s.status==="connected";}).length;
    return '<div class="notice">* Этап проекта импортирован из публичного каталога и не подтверждает работоспособность продукта. Все новые статусы в журнале — ручные записи до подключения проверяемой синхронизации GitHub и CI/CD.</div>'+
      '<div class="stats"><div class="stat"><div class="stat-label">Закрыто задач</div><div class="stat-number">'+done+'</div><div class="stat-desc">Из '+(p.tasks||[]).length+' учтённых</div></div><div class="stat"><div class="stat-label">Осталось задач</div><div class="stat-number">'+todo+'</div><div class="stat-desc">Не всё может быть внесено</div></div><div class="stat"><div class="stat-label">Открытые ошибки</div><div class="stat-number">'+open+'</div><div class="stat-desc">Из локального журнала</div></div><div class="stat"><div class="stat-label">Подключено сервисов</div><div class="stat-number">'+connected+'</div><div class="stat-desc">По ручным отметкам</div></div></div>'+
      '<div class="two-col"><div><section class="panel"><h3>Следующее действие</h3><p class="muted">'+escapeHtml(p.nextAction||"Пока не определено. В редакторе проекта запиши одно конкретное следующее действие.")+'</p><div class="inline-actions"><button class="btn small" data-action="edit-project">Указать следующий шаг</button>'+action("task","Добавить задачу")+'</div></section>'+
      '<section class="panel"><h3>Связи с проектом</h3><div class="quick-links">'+links(p)+'</div><p class="hint" style="margin-top:13px">Связь с GitHub подтверждает расположение кода, но не состояние сборки или production.</p></section>'+
      '<section class="panel"><h3>Последние записи</h3>'+recordRows((p.events||[]).slice(-3),"events")+'<div class="inline-actions">'+action("event","Новая запись")+action("note","Новая заметка")+'</div></section></div>'+
      '<div><section class="panel"><h3>Финансы</h3><div class="data-row"><span>Учтённые фактические платежи / месяц</span><b>'+((p.expenses||[]).some(function(e){return e.frequency==="monthly"&&e.confidence==="actual";})?money(expensesTotal(p,"monthly")):"Не внесены")+'</b></div><div class="data-row"><span>Разовые расходы</span><b>'+((p.expenses||[]).some(function(e){return e.frequency==="once"&&e.confidence==="actual";})?money(expensesTotal(p,"once")):"Не внесены")+'</b></div><div class="inline-actions">'+action("expense","Учесть расход")+'</div></section>'+
      '<section class="panel"><h3>Происхождение</h3><div class="data-row"><span>Источник</span><b>'+escapeHtml(p.origin||"Вручную")+'</b></div><div class="data-row"><span>Репозитории</span><b>'+(p.repositories||[]).length+'</b></div><div class="data-row"><span>Последнее ручное изменение</span><b>'+escapeHtml(p.updatedAt||"Не было")+'</b></div><div class="data-row"><span>Подтверждение состояния</span><b>Требуется</b></div></section></div></div>';
  }
  function detailSection(p,tab) {
    if(tab==="overview")return detailsOverview(p);
    var meta={notes:["Заметки и идеи","note","Заметка"],tasks:["Задачи","task","Задача"],bugs:["Ошибки и блокеры","bug","Ошибка"],expenses:["Затраты","expense","Расход"],integrations:["Сервисы и зависимости","integration","Сервис"],events:["История изменений","event","Событие"],decisions:["Журнал решений","decision","Решение"]}[tab];
    if(!meta)return "";
    return '<section class="panel"><div class="section-head" style="margin:0 0 17px"><div><h2>'+meta[0]+'</h2><p class="hint" style="margin-top:6px">Записи сохраняются только локально. Не подменяют результаты тестов или CI.</p></div>'+action(meta[1],meta[2])+'</div>'+recordRows(p[tab],tab)+'</section>';
  }
  function ideaEvaluation(p) {
    var score=engine.ideaScore(p);
    var details=score?'<div class="evaluation-factors">'+score.fields.map(function(x){return '<div><span>'+escapeHtml(x.label)+'</span><b>'+x.value+'/5</b></div>';}).join("")+'</div>':'<p class="muted">Нет оценки. Добавь собственное мнение по пяти факторам и сравнивай идеи без выдуманных баллов.</p>';
    return '<section class="panel"><div class="section-head" style="margin-top:0"><div><span class="section-kicker">Idea intelligence / manual</span><h3>Оценка перспективы</h3></div><button class="btn small" data-action="evaluate-idea">✎ Оценить идею</button></div>'+
      (score?'<div class="score-number">'+score.score+'<span>/100</span></div>':'')+details+'<p class="hint">Оценка субъективна. Баллы не измеряют выручку, вероятность успеха или готовность продукта.</p></section>';
  }
  function detail() {var p=project();if(!p){selectedId=null;return overview();}return header(p)+(isIdea(p)?ideaEvaluation(p):"")+tabs(p)+detailSection(p,activeTab);}
  function attention() {
    var bugs=[],blocked=[],pending=[];
    store.projects.forEach(function(p){(p.bugs||[]).forEach(function(b){if(b.status!=="resolved")bugs.push({project:p,record:b});});(p.integrations||[]).forEach(function(i){if(i.status==="blocked")blocked.push({project:p,record:i});});(p.tasks||[]).forEach(function(t){if(t.status!=="done"&&t.priority==="high")pending.push({project:p,record:t});});});
    function items(arr){return arr.map(function(e){return '<div class="data-row"><div><b>'+escapeHtml(e.record.title)+'</b><div class="muted">'+escapeHtml(e.project.name)+'</div></div><button class="btn small ghost" data-action="open-project" data-id="'+escapeHtml(e.project.id)+'">Открыть</button></div>';}).join("");}
    return '<div class="eyebrow">Attention queue</div><h1>Что требует внимания</h1><p class="lead">Только зарегистрированные препятствия и приоритеты. Отсутствие записи не означает отсутствие проблем.</p><div class="two-col"><div><section class="panel"><h3>Открытые баги · '+bugs.length+'</h3>'+(bugs.length?items(bugs):blank("Пока не внесены"))+'</section><section class="panel"><h3>Сервисы заблокированы · '+blocked.length+'</h3>'+(blocked.length?items(blocked):blank("Пока не внесены"))+'</section></div><div><section class="panel"><h3>Высокий приоритет · '+pending.length+'</h3>'+(pending.length?items(pending):blank("Нет помеченных задач"))+'</section></div></div>';
  }
  function repositories() {
    var matched=store.repositories.filter(function(r){return store.projects.some(function(p){return (p.repositories||[]).includes(r.fullName);});}).length;
    return '<div class="eyebrow">GitHub inventory</div><h1>Код и связи</h1><p class="lead">Импортированный список репозиториев. Их наличие не подтверждает прохождение тестов и доступность продакшена.</p><div class="stats"><div class="stat"><div class="stat-label">Всего репозиториев</div><div class="stat-number">'+store.repositories.length+'</div></div><div class="stat"><div class="stat-label">Есть связь с проектом</div><div class="stat-number">'+matched+'</div></div></div><section class="panel"><h3>Репозитории</h3>'+
      store.repositories.map(function(r){var owner=store.projects.filter(function(p){return (p.repositories||[]).includes(r.fullName);}).map(function(p){return p.name;});return '<div class="data-row"><div><a class="link" href="'+escapeHtml(safeUrl(r.github))+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(r.fullName)+'</a><div class="muted">'+escapeHtml(r.visibility||"")+'</div></div><span class="row-right">'+escapeHtml(owner.join(", ")||"Не сопоставлен")+'</span></div>';}).join("")+'</section>';
  }
  function financeView() {
    var projects=store.projects.filter(isProject),all=engine.expenseSummary(projects);
    var rows=projects.map(function(p){return {project:p,cost:engine.expenseSummary([p])};}).filter(function(x){return x.project.expenses && x.project.expenses.length;});
    var dollars=function(value,has){return has?money(value):"Не внесено";};
    var card=function(label,bucket,k,period){return '<div class="stat"><div class="stat-label">'+label+'</div><div class="stat-number cost-value">'+dollars(bucket[k],bucket[k==="actual"?"hasActual":"hasEstimate"])+'</div><div class="stat-desc">'+period+' · USD · ручные записи</div></div>';};
    return '<div class="eyebrow">Finances / Expense ledger</div><h1>Стоимость проектов</h1><p class="lead">Разовые и ежемесячные расходы отдельно. Реальные платежи никогда не смешиваются с оценками. Отсутствие записи не означает, что сервис бесплатный.</p>'+
      '<div class="stats">'+card("Подтверждено пользователем / мес",all.monthly,"actual","Ежемесячно")+card("Оценка / мес",all.monthly,"estimate","Ежемесячно")+
      card("Учтённые разовые платежи",all.once,"actual","Разово")+card("Оценка разовых затрат",all.once,"estimate","Разово")+'</div>'+
      '<section class="panel"><h3>Расходы по проектам</h3>'+(rows.length?rows.map(function(entry){var c=entry.cost;return '<div class="data-row"><div><b>'+escapeHtml(entry.project.name)+'</b><div class="muted">'+entry.project.expenses.length+' зарегистрированных статей</div></div><div class="row-right"><div>Факт в месяц: '+dollars(c.monthly.actual,c.monthly.hasActual)+'</div><div>Оценка в месяц: '+dollars(c.monthly.estimate,c.monthly.hasEstimate)+'</div><button class="clickable" data-action="open-project" data-id="'+escapeHtml(entry.project.id)+'">Открыть →</button></div></div>';}).join(""):'<p class="muted">Пока нет расходов, внесённых в блокнот.</p>')+'</section>'+
      '<div class="notice">Суммы отражают только введённые вручную данные и не являются банковской выпиской. Интеграции с платёжными сервисами и банковскими счетами не настроены.</div>';
  }
  function weeklyPanel() {
    var w=engine.weeklyReview(store.focusDays,today());
    return '<section class="panel"><h3>Последние 7 дней — рабочий ритм</h3><div class="week-metrics"><div><b>'+w.daysWithFocus+'</b><span>Дней с проектом</span></div><div><b>'+w.completedDays+'</b><span>Дней с итогом</span></div><div><b>'+w.missedDays+'</b><span>Без записи</span></div></div><p class="hint">'+escapeHtml(w.disclaimer)+'</p></section>';
  }
  function render() {
    var inner=selectedId?detail():view==="today"?todayView(false):view==="attention"?attention():view==="repositories"?repositories():view==="finance"?financeView():view==="overview"?overview():
      (view==="ideas"?ideasLead():'<div class="eyebrow">Project portfolio</div><h1>Проекты в работе и планах</h1><p class="lead">Здесь только проекты, которые мы решили реализовать. Новые гипотезы живут отдельно в разделе «Идеи».</p><div class="inline-actions"><button class="btn" data-action="new-working-project">+ Создать проект</button></div>')+
      '<div class="section-head"><h2>'+(view==="ideas"?"Банк идей":"Реестр проектов")+'</h2><span class="mini">'+allProjects().length+' записей</span></div>'+listing();
    app.innerHTML=shell(inner);
  }
  function markProjectChanged(p,what) {
    p.updatedAt=today();
    if(what) {p.events=p.events||[];p.events.push({id:uid(),title:what,note:"Событие из ручного действия в интерфейсе",date:today(),source:"manual"});}
    persist();render();
  }
  var definitions={
    project:{title:"Записать идею",fields:[["name","Название","text",true],["summary","Суть идеи","textarea",true],["category","Категория","text",false],["nextAction","Следующий шаг","text",false]]},
    workingproject:{title:"Создать проект",fields:[["name","Название","text",true],["summary","Что реализуем","textarea",true],["category","Категория","text",false],["nextAction","Первый следующий шаг","textarea",false]]},
    focus:{title:"Выбрать один проект на сегодня",fields:[["projectId","Проект","project-select",true],["goal","Одна главная цель дня","textarea",true]]},
    finish:{title:"Завершить день",fields:[["result","Что реально сделано сегодня?","textarea",true],["nextStep","Что делать следующим шагом?","textarea",false]]},
    evaluate:{title:"Оценить идею — 1 (низко) до 5 (высоко)",fields:[["impact","Размер возможности","select:1|2|3|4|5",true],["speed","Быстрота результата","select:1|2|3|4|5",true],["fit","Наше преимущество","select:1|2|3|4|5",true],["feasibility","Реализуемость","select:1|2|3|4|5",true],["evidence","Подтверждённый спрос","select:1|2|3|4|5",true],["note","Почему так считаем?","textarea",false]]},
    edit:{title:"Редактировать проект",fields:[["name","Название","text",true],["summary","Описание","textarea",true],["category","Категория","text",false],["stage","Этап","select:Planned|Concept|Research|Prototype|Building|Private beta|Operating|Internal|Applied build|Archive",false],["nextAction","Следующий шаг","textarea",false],["url","Сайт (HTTPS)","text",false]]},
    note:{title:"Заметка к проекту",fields:[["title","Тема заметки","text",true],["note","Текст, гипотезы, выводы","textarea",true],["evidence","Источник или ссылка","text",false]]},
    task:{title:"Новая задача",fields:[["title","Что нужно сделать?","text",true],["note","Детали","textarea",false],["priority","Приоритет","select:normal|high|low",false],["evidence","Ссылка на задачу / PR","text",false]]},
    bug:{title:"Новая ошибка",fields:[["title","Что сломано?","text",true],["note","Как воспроизвести","textarea",false],["severity","Критичность","select:critical|high|medium|low",false],["evidence","Ссылка на подтверждение","text",false]]},
    expense:{title:"Добавить расход",fields:[["title","Сервис / назначение","text",true],["amount","Сумма USD","number",true],["frequency","Период","select:monthly|once",false],["confidence","Достоверность","select:estimate|actual",false],["note","Примечание","textarea",false]]},
    integration:{title:"Добавить сервис",fields:[["title","Сервис","text",true],["status","Состояние","select:planned|connected|blocked",false],["note","Для чего нужен","textarea",false],["evidence","Ссылка на сервис","text",false]]},
    event:{title:"Записать изменение",fields:[["title","Что изменилось?","text",true],["note","Результат и проверка","textarea",false],["evidence","Ссылка на commit / PR","text",false]]},
    decision:{title:"Зафиксировать решение",fields:[["title","Что решили?","text",true],["note","Почему и что не менять","textarea",false],["evidence","Ссылка на обсуждение","text",false]]}
  };
  function showDialog(kind) {
    var def=definitions[kind];if(!def)return;
    activeForm=kind;
    document.getElementById("dialog-title").textContent=def.title;
    var p=project();
    fields.innerHTML=def.fields.map(function(f) {
      var name=f[0],label=f[1],type=f[2],required=f[3];
      var record=editingRecord&&p?(p[editingRecord.collection]||[]).find(function(r){return r.id===editingRecord.id;}):null;
      var value=kind==="edit"&&p?p[name]||"":kind==="evaluate"&&p&&p.evaluation?p.evaluation[name]||"":kind==="focus"&&name==="projectId"?(focusCandidateId||""):record&&record[name]!=null?record[name]:"";
      var control=type==="project-select"?'<select name="'+name+'" required>'+(value?"":'<option value="" disabled selected>Выбери проект…</option>')+store.projects.filter(isProject).map(function(item){return '<option value="'+escapeHtml(item.id)+'" '+(item.id===value?"selected":"")+'>'+escapeHtml(item.name)+'</option>';}).join("")+'</select>':type==="textarea"?'<textarea name="'+name+'" '+(required?"required":"")+'>'+escapeHtml(value)+'</textarea>':
        type.indexOf("select:")===0?'<select name="'+name+'" '+(required?"required":"")+'>'+(required && (value==null||value==="")?'<option value="" disabled selected>Выбери оценку…</option>':"")+type.slice(7).split("|").map(function(opt){return '<option value="'+escapeHtml(opt)+'" '+(String(value)===opt?"selected":"")+'>'+escapeHtml(opt)+'</option>';}).join("")+'</select>':
        '<input name="'+name+'" type="'+type+'" '+(type==="number"?'min="0" step="0.01" ':'')+(required?"required ":"")+'value="'+escapeHtml(value)+'">';
      return '<div class="field"><label for="field-'+name+'">'+escapeHtml(label)+'</label>'+control.replace('name="'+name+'"','name="'+name+'" id="field-'+name+'"')+'</div>';
    }).join("");
    dialog.showModal();
    var first=fields.querySelector("input,textarea,select");if(first)first.focus();
  }
  function saveDialog(event) {
    event.preventDefault();
    var def=definitions[activeForm],values={},data=new FormData(form);
    if(!def)return;
    def.fields.forEach(function(f){values[f[0]]=String(data.get(f[0])||"").trim();});
    if(activeForm==="project"||activeForm==="workingproject"){
      var duplicateName=store.projects.find(function(p){return p.name.toLocaleLowerCase("ru")===String(values.name||"").toLocaleLowerCase("ru");});
      if(duplicateName&&!confirm("Запись с таким названием уже существует: "+duplicateName.name+". Создать ещё одну?"))return;
    }
    if(activeForm==="evaluate"){
      var currentIdea=project();
      if(!currentIdea||!isIdea(currentIdea))return;
      var factorNames=Object.keys(engine.WEIGHTS);
      if(!factorNames.every(function(k){return /^[1-5]$/.test(values[k]||"");})){notify("Оцени каждый критерий от 1 до 5");return;}
      currentIdea.evaluation={};factorNames.forEach(function(k){currentIdea.evaluation[k]=Number(values[k]);});
      currentIdea.evaluation.note=values.note;
      currentIdea.evaluation.updatedAt=today();currentIdea.evaluation.source="manual";
      currentIdea.updatedAt=today();
      currentIdea.events.push({id:uid(),title:"Идея оценена по пяти критериям",date:today(),source:"manual",note:values.note||"Субъективная ручная оценка"});
      notify("Оценка сохранена");
    }else if(activeForm==="project" || activeForm==="workingproject"){
      var kind=activeForm==="project"?"idea":"project";
      var p={id:uid(),kind:kind,ideaStatus:kind==="idea"?"inbox":null,name:values.name,summary:values.summary,category:values.category||"Новая разработка",nextAction:values.nextAction,stage:kind==="idea"?"Concept":"Planned",origin:"Manual entry",stateEvidence:"not-verified",repositories:[],tasks:[],bugs:[],expenses:[],integrations:[],events:[],decisions:[],notes:[],updatedAt:today()};
      store.projects.unshift(p);selectedId=p.id;activeTab="overview";view=kind==="idea"?"ideas":"projects";
      notify(kind==="idea"?"Идея сохранена отдельно":"Проект создан");
    }else if(activeForm==="focus"){
      if(focusDay()){notify("На сегодня уже выбран проект");return;}
      var picked=store.projects.find(function(p){return p.id===values.projectId&&isProject(p);});
      if(!picked||!values.goal){notify("Укажи проект и одну цель");return;}
      store.focusDays[today()]={projectId:picked.id,goal:values.goal,status:"active",startedAt:new Date().toISOString(),result:"",nextStep:""};
      picked.events.push({id:uid(),date:today(),source:"manual",title:"Выбран проектом дня",note:values.goal});
      picked.updatedAt=today();selectedId=null;view="today";
      notify("Проект дня выбран");
    }else if(activeForm==="finish"){
      var day=focusDay();if(!day||day.status!=="active"){notify("Активного проекта дня нет");return;}
      var dailyProject=store.projects.find(function(p){return p.id===day.projectId;});
      if(!dailyProject){notify("Проект дня не найден");return;}
      day.status="closed";day.result=values.result;day.nextStep=values.nextStep;day.closedAt=new Date().toISOString();
      dailyProject.events.push({id:uid(),date:today(),source:"manual",title:"Итог работы за день",note:values.result+(values.nextStep?" | Следующий шаг: "+values.nextStep:"")});
      if(values.nextStep)dailyProject.nextAction=values.nextStep;
      dailyProject.updatedAt=today();selectedId=null;view="today";
      notify("Итог дня зафиксирован");
    }else if(activeForm==="edit"){
      var current=project();if(!current)return;
      if(values.url&&!safeUrl(values.url)){notify("Некорректная ссылка на сайт");return;}
      Object.assign(current,values);
      current.updatedAt=today();
      current.events.push({id:uid(),title:"Обновлена карточка",date:today(),source:"manual",note:"Изменения внесены вручную"});
      notify("Карточка сохранена");
    }else{
      var target=project();if(!target)return;
      if(values.evidence&&!safeUrl(values.evidence)){notify("Ссылка должна начинаться с https:// или http://");return;}
      if(activeForm==="expense"){values.amount=Number(values.amount);if(!Number.isFinite(values.amount)||values.amount<0){notify("Недопустимая сумма");return;}}
      if(!values.title){notify("Нужно название записи");return;}
      if(editingRecord){
        var original=(target[editingRecord.collection]||[]).find(function(x){return x.id===editingRecord.id;});
        if(!original){notify("Запись не найдена");return;}
        values.id=original.id;values.date=original.date;values.source=original.source||"manual";
        if(original.status)values.status=original.status;
        Object.assign(original,values,{updatedAt:today()});
        target.events.push({id:uid(),date:today(),title:"Запись отредактирована: "+values.title,source:"manual"});
        target.updatedAt=today();notify("Запись исправлена");
        persist();dialog.close();activeForm=null;editingRecord=null;render();return;
      }
      values.id=uid();values.date=today();values.source="manual";
      if(activeForm==="task")values.status="todo";
      if(activeForm==="bug")values.status="open";
      var key={note:"notes",task:"tasks",bug:"bugs",expense:"expenses",integration:"integrations",event:"events",decision:"decisions"}[activeForm];
      target[key].push(values);
      target.updatedAt=today();
      if(activeForm!=="event")target.events.push({id:uid(),title:"Добавлена запись: "+kindName(activeForm).toLowerCase()+" — "+values.title,date:today(),source:"manual"});
      notify(kindName(activeForm)+" добавлена");
    }
    persist();dialog.close();activeForm=null;editingRecord=null;render();
  }
  function exportProjectBrief(p){
    if(!p)return;
    var markdown=engine.markdown(p,store.focusDays);
    var filename="ATLAS-"+String(p.name).replace(/[^\p{L}\p{N}-]+/gu,"-").slice(0,54)+"-"+today()+".md";
    var blob=new Blob([markdown],{type:"text/markdown;charset=utf-8"}),url=URL.createObjectURL(blob),anchor=document.createElement("a");
    anchor.href=url;anchor.download=filename;document.body.appendChild(anchor);anchor.click();anchor.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},1000);notify("Паспорт проекта экспортирован");
  }
  function exportBackup() {
    var json=JSON.stringify({format:"margaryan-atlas-backup",exportedAt:new Date().toISOString(),data:store},null,2);
    var blob=new Blob([json],{type:"application/json;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="atlas-backup-"+today()+".json";document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);notify("Резервная копия выгружена");
  }
  function onImport(file) {
    if(!file)return;
    if(file.size>5*1024*1024){notify("Файл слишком большой (максимум 5 МБ)");return;}
    var reader=new FileReader();
    reader.onload=function() {
      try {
        var parsed=JSON.parse(reader.result), incoming=parsed.format==="margaryan-atlas-backup"?parsed.data:parsed;
        if(!incoming||![1,2].includes(incoming.version)||!isArray(incoming.projects)||!isArray(incoming.repositories)||incoming.projects.length>2000)throw Error("Некорректный формат");
        if(!incoming.projects.every(function(p){return p&&hasText(p.id)&&hasText(p.name)&&isArray(p.tasks)&&isArray(p.bugs)&&isArray(p.events)&&isArray(p.expenses)&&isArray(p.integrations)&&isArray(p.decisions);}))throw Error("Некорректные записи");
        if(!confirm("Заменить текущие данные импортированной копией? Сначала сделай экспорт текущей версии."))return;
        store=normalizeStore(clone(incoming));selectedId=null;view="overview";persist();render();notify("Резервная копия восстановлена");
      } catch(err) {notify("Импорт не выполнен: "+err.message);}
    };
    reader.readAsText(file);
  }
  app.addEventListener("click",function(e){
    var el=e.target.closest("[data-action]");if(!el)return;
    var action=el.dataset.action,p=project();
    if(action==="nav"){view=el.dataset.view;selectedId=null;stageFilter="all";query="";render();}
    if(action==="go-home"){view=p&&isIdea(p)?"ideas":"projects";selectedId=null;render();}
    if(action==="open-project"){selectedId=el.dataset.id;activeTab="overview";render();window.scrollTo(0,0);}
    if(action==="tab"){activeTab=el.dataset.tab;render();}
    if(action==="new-project"){editingRecord=null;showDialog("project");}
    if(action==="evaluate-idea"&&p&&isIdea(p)){editingRecord=null;showDialog("evaluate");}
    if(action==="new-working-project"){editingRecord=null;showDialog("workingproject");}
    if(action==="start-focus"){
      if(focusDay()){notify("На сегодня уже есть проект дня. Завтра можно выбрать новый.");return;}
      if(!store.projects.some(isProject)){notify("Сначала создай проект");return;}
      focusCandidateId=el.dataset.id||null;
      showDialog("focus");
    }
    if(action==="close-focus"){
      if(focusDay() && focusDay().status==="active")showDialog("finish");
      else notify("Нет активного дня");
    }
    if(action==="idea-status" && p && isIdea(p)){
      var status=el.dataset.status;
      if(["inbox","shortlist","hold","rejected"].includes(status)){p.ideaStatus=status;markProjectChanged(p,"Статус идеи: "+ideaStatusName(status));notify("Отбор идеи обновлён");}
    }
    if(action==="promote-idea" && p && isIdea(p)){
      if(!confirm("Перевести «"+p.name+"» из идей в проекты? Она исчезнет из банка идей и появится в разделе проектов."))return;
      p.kind="project";p.ideaStatus=null;p.stage="Planned";p.promotedAt=today();
      view="projects";markProjectChanged(p,"Идея переведена в проекты для реализации");notify("Идея стала проектом");
    }
    if(action==="edit-project"&&p){editingRecord=null;showDialog("edit");}
    if(action==="add-record"&&p){editingRecord=null;showDialog(el.dataset.kind);}
    if(action==="edit-record"&&p){
      var editingTypes={notes:"note",tasks:"task",bugs:"bug",expenses:"expense",integrations:"integration",events:"event",decisions:"decision"},collection=el.dataset.kind;
      if(editingTypes[collection]&&(p[collection]||[]).some(function(x){return x.id===el.dataset.id;})){
        editingRecord={collection:collection,id:el.dataset.id};
        showDialog(editingTypes[collection]);
      }
    }
    if(action==="export-brief"&&p)exportProjectBrief(p);
    if(action==="export")exportBackup();
    if(action==="import")document.getElementById("import-json").click();
    if(action==="toggle-task"&&p){
      var task=(p.tasks||[]).find(function(t){return t.id===el.dataset.id;});
      if(task){task.status=el.checked?"done":"todo";markProjectChanged(p,(el.checked?"Отмечена выполненной: ":"Возвращена в работу: ")+task.title);}
    }
    if(action==="resolve-bug"&&p){var bug=p.bugs.find(function(b){return b.id===el.dataset.id;});if(bug){bug.status="resolved";markProjectChanged(p,"Отмечена исправленной: "+bug.title);}}
    if(action==="delete-record"&&p){
      if(!confirm("Удалить эту запись?"))return;
      var key={notes:"notes",tasks:"tasks",bugs:"bugs",expenses:"expenses",events:"events",decisions:"decisions",integrations:"integrations"}[el.dataset.kind];
      if(key){p[key]=p[key].filter(function(r){return r.id!==el.dataset.id;});store.deletedRecordIds=store.deletedRecordIds||[];if(!store.deletedRecordIds.includes(el.dataset.id))store.deletedRecordIds.push(el.dataset.id);p.updatedAt=today();persist();render();notify("Запись удалена");}
    }
  });
  app.addEventListener("keydown",function(e){if((e.key==="Enter"||e.key===" ")&&e.target.classList.contains("project-card")){e.preventDefault();e.target.click();}});
  app.addEventListener("input",function(e){if(e.target.id==="project-search"){var start=e.target.selectionStart;query=e.target.value;render();var input=document.getElementById("project-search");if(input){input.focus();try{input.setSelectionRange(start,start);}catch(_){}}}});
  app.addEventListener("change",function(e){if(e.target.id==="stage-filter"){stageFilter=e.target.value;render();}});
  form.addEventListener("submit",saveDialog);
  document.getElementById("close-dialog").addEventListener("click",function(){dialog.close();editingRecord=null;});
  document.getElementById("cancel-dialog").addEventListener("click",function(){dialog.close();editingRecord=null;});
  document.getElementById("import-json").addEventListener("change",function(e){onImport(e.target.files[0]);e.target.value="";});
  render();
}());
