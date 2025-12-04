document.addEventListener('DOMContentLoaded',()=>{
 const btn=document.getElementById('submit-btn');
 const form=document.getElementById('quiz-form');
 const banner=document.getElementById('result-banner');
 if(!btn||!form||!window.ANSWERS)return;
 const STORAGE_KEY='quiz:'+location.pathname;
 let submitted=false;

 function shuffle(arr){for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}}

 function shuffleQuestions(){
   const qs=[...form.querySelectorAll('.question')];
   shuffle(qs);
   const act=form.querySelector('.exam-actions');
   qs.forEach(q=>form.insertBefore(q,act));
 }

 function shuffleAnswers(){
   [...form.querySelectorAll('.question')].forEach(q=>{
     const labs=[...q.querySelectorAll('label')];
     shuffle(labs);
     labs.forEach(l=>q.appendChild(l));
   });
 }

 function saveState(){
   const st={};
   form.querySelectorAll('input[type=radio]').forEach(i=>{if(i.checked) st[i.name]=i.value;});
   localStorage.setItem(STORAGE_KEY,JSON.stringify(st));
 }

 function loadState(){
   let st={};
   try{st=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');}catch(e){}
   Object.keys(st).forEach(k=>{
     const inp=form.querySelector(`input[name="${k}"][value="${st[k]}"]`);
     if(inp){inp.checked=true; mark(k);}
   });
 }

 function clearState(){ localStorage.removeItem(STORAGE_KEY); }

 function mark(q){
   const inp=form.querySelector(`input[name="${q}"]`); if(!inp)return;
   const box=inp.closest('.question');
   const sel=form.querySelector(`input[name="${q}"]:checked`);
   box.classList.remove('correct','incorrect');
   if(!sel)return;
   box.classList.add(sel.value===ANSWERS[q]?'correct':'incorrect');
 }

 function grade(){
   let score=0;
   const qs=[...form.querySelectorAll('.question')];
   qs.forEach(q=>{
     const inp=q.querySelector('input[type=radio]');
     if(!inp)return;
     const sel=form.querySelector(`input[name="${inp.name}"]:checked`);
     q.classList.remove('correct','incorrect');
     if(sel){
       if(sel.value===ANSWERS[inp.name]){score++; q.classList.add('correct');}
       else q.classList.add('incorrect');
     }
   });
   const total=Object.keys(ANSWERS).length;
   const pct=(score/total)*100;
   const pass=pct>=70;
   banner.className=''; 
   banner.classList.add(pass?'pass':'fail');
   banner.textContent=`Score: ${score}/${total} (${pct.toFixed(0)}%). `+(pass?'PASS':'REVIEW RECOMMENDED');
   banner.style.display='block';
   submitted=true;
   btn.textContent='Retake Test';
   btn.classList.add('submitted');
 }

 function reset(){
   form.querySelectorAll('.question').forEach(q=>q.classList.remove('correct','incorrect'));
   form.querySelectorAll('input[type=radio]').forEach(i=>i.checked=false);
   banner.style.display='none';
   banner.textContent='';
   clearState();
   shuffleQuestions();
   shuffleAnswers();
   submitted=false;
   btn.textContent='Submit Answers';
   btn.classList.remove('submitted');
 }

 form.querySelectorAll('input[type=radio]').forEach(r=>{
   r.addEventListener('change',()=>{ if(!submitted) mark(r.name); saveState(); });
 });

 btn.addEventListener('click',()=>{ submitted?reset():grade(); });

 loadState();
});
