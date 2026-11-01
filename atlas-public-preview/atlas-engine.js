/* ATLAS Engine — deterministic and source-honest helpers. No network or storage. */
(function(root){
  "use strict";
  function finite(n){return Number.isFinite(Number(n))&&String(n).trim()!=="";}
  function bounded(n){return finite(n)&&Number(n)>=1&&Number(n)<=5&&Number.isInteger(Number(n));}
  var WEIGHTS={impact:0.30,speed:0.25,fit:0.20,feasibility:0.15,evidence:0.10};
  var LABELS={impact:"Размер возможности",speed:"Скорость до первых результатов",fit:"Соответствие сильным сторонам",feasibility:"Реализуемость",evidence:"Подтверждённый спрос"};
  function ideaScore(idea){
    var evaluation=idea&&idea.evaluation;
    if(!evaluation||typeof evaluation!=="object")return null;
    var fields=Object.keys(WEIGHTS);
    if(!fields.every(function(k){return bounded(evaluation[k]);}))return null;
    var weighted=fields.reduce(function(total,k){return total+Number(evaluation[k])*WEIGHTS[k];},0);
    return {score:Math.round(weighted*20),basis:"manual",weights:WEIGHTS,fields:fields.map(function(k){return {key:k,label:LABELS[k],value:Number(evaluation[k]),weight:WEIGHTS[k]};}),note:"Субъективный рейтинг 5 факторов, не прогноз прибыли или вероятность успеха."};
  }
  function expenseSummary(projects){
    var bucket={monthly:{actual:0,estimate:0,hasActual:false,hasEstimate:false},once:{actual:0,estimate:0,hasActual:false,hasEstimate:false}};
    (projects||[]).forEach(function(p){
      (p.expenses||[]).forEach(function(e){
        var freq=e.frequency==="monthly"?"monthly":"once",proof=e.confidence==="actual"?"actual":"estimate",amount=Number(e.amount);
        if(!Number.isFinite(amount)||amount<0)return;
        bucket[freq][proof]+=amount;bucket[freq][proof==="actual"?"hasActual":"hasEstimate"]=true;
      });
    });
    return bucket;
  }
  function trackedProgress(project){
    var tasks=(project&&project.tasks)||[],done=tasks.filter(function(t){return t.status==="done";}).length;
    return {tracked:tasks.length,done:done,remaining:tasks.length-done,percent:tasks.length?Math.round(done/tasks.length*100):null,disclaimer:"Только внесённые задачи. Не является степенью готовности продукта."};
  }
  function riskSummary(project) {
    var bugs=(project.bugs||[]).filter(function(x){return x.status!=="resolved";});
    var services=(project.integrations||[]).filter(function(x){return x.status==="blocked";});
    var critical=bugs.filter(function(x){return x.severity==="critical"||x.severity==="high";});
    return {openBugs:bugs.length,criticalBugs:critical.length,blockedServices:services.length,attention:bugs.length+services.length,observed:true,disclaimer:"Только зарегистрированные проблемы. Отсутствие записей не доказывает отсутствие ошибок."};
  }
  function recentDays(days,asOf){
    var list=[],date=Date.parse(asOf+"T12:00:00Z");
    if(!Number.isFinite(date))return list;
    for(var i=0;i<days;i++){list.push(new Date(date-i*86400000).toISOString().slice(0,10));}
    return list;
  }
  function weeklyReview(focusDays,asOf){
    var keys=recentDays(7,asOf),entries=keys.map(function(k){return {date:k,day:(focusDays||{})[k]};}).filter(function(x){return !!x.day;});
    return {daysWithFocus:entries.length,completedDays:entries.filter(function(x){return x.day.status==="closed";}).length,missedDays:keys.length-entries.length,entries:entries,disclaimer:"Только дни с ручным выбором проекта; не показатель продуктивности."};
  }
  function markdown(project,focusDays) {
    var e=function(v){return String(v==null?"":v).replace(/\r/g,"").trim();};
    var section=function(name,items,formatter){return "\n## "+name+"\n"+((items||[]).length?(items||[]).map(formatter).join("\n"):"— записей нет")+"\n";};
    var str="# "+e(project.name)+"\n\n"+e(project.summary)+"\n\n"+
      "- Тип: "+(project.kind==="idea"?"идея":"проект")+"\n"+
      "- Этап (ручной): "+e(project.stage)+"\n"+
      "- Следующий шаг: "+e(project.nextAction||"не указан")+"\n"+
      "- Источник: "+e(project.origin||"неизвестен")+"\n"+
      "- Проверка production: не подтверждена автоматически\n";
    str+=section("Заметки",project.notes,function(n){return "- "+e(n.date||"")+" · "+e(n.title)+" — "+e(n.note||"");});
    str+=section("Задачи",project.tasks,function(t){return "- ["+(t.status==="done"?"x":" ")+"] "+e(t.title)+(t.evidence?" · "+e(t.evidence):"");});
    str+=section("Ошибки",project.bugs,function(b){return "- "+(b.status==="resolved"?"[исправлено вручную] ":"[открыто] ")+e(b.title)+" · "+e(b.severity||"severity unknown");});
    str+=section("Решения",project.decisions,function(d){return "- "+e(d.date||"")+" · "+e(d.title)+" — "+e(d.note||"");});
    str+=section("Расходы, USD",project.expenses,function(x){return "- "+e(x.title)+" · $"+(Number(x.amount)||0)+" / "+e(x.frequency)+" · "+e(x.confidence);});
    str+=section("Сервисы",project.integrations,function(x){return "- "+e(x.title)+" · "+e(x.status)+" · "+e(x.note||"");});
    str+=section("Репозитории",project.repositories,function(x){return "- https://github.com/"+e(x);});
    var sessions=Object.keys(focusDays||{}).sort().reverse().filter(function(day){return focusDays[day].projectId===project.id;});
    str+=section("Рабочие дни",sessions,function(day){var d=focusDays[day];return "- "+day+" · "+e(d.goal)+" · итог: "+e(d.result||"не заполнен")+" · следующее: "+e(d.nextStep||"не указан");});
    str+=section("История изменений",project.events,function(x){return "- "+e(x.date||"")+" · "+e(x.title)+" · "+e(x.note||"");});
    str+="\n---\nЭкспорт ATLAS: статусы и затраты отражают записи пользователя, не независимый аудит.\n";
    return str;
  }
  root.ATLAS_ENGINE={WEIGHTS:WEIGHTS,LABELS:LABELS,ideaScore:ideaScore,expenseSummary:expenseSummary,trackedProgress:trackedProgress,riskSummary:riskSummary,weeklyReview:weeklyReview,markdown:markdown};
})(typeof window!=="undefined"?window:globalThis);
