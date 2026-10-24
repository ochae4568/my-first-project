import {definitions,calculate} from './calculations.js';
let selected='automatic',phase='3';
const $=s=>document.querySelector(s);
const icons=['▦','ϟ','◈','↘','◉','▤','⚙','☼','◎','◇','≡'];
Object.entries(definitions).sort(([a],[b])=>({automatic:-2,sizing:-1}[a]??0)-({automatic:-2,sizing:-1}[b]??0)).forEach(([key,d],i)=>{const button=document.createElement('button');button.innerHTML=`<span>${icons[i]??"▧"}</span>${d.title}`;button.onclick=()=>select(key);button.dataset.key=key;$('#nav').append(button);});

function addAmpacityRow(area=''){
 const row=document.createElement('tr');
 row.innerHTML='<td><input class="area-cell" type="number" min="0" step="any" aria-label="전선 굵기 mm²"></td><td><input class="ampacity-cell" type="number" min="0" step="any" aria-label="보정 전 허용전류 A" placeholder="표 값 입력"></td><td><button type="button" class="delete-row" aria-label="이 행 삭제">×</button></td>';
 row.querySelector('.area-cell').value=area;
 row.querySelector('button').onclick=()=>{row.remove();reset();};$('#ampacity-rows').append(row);
}
for(const area of [1.5,2.5,4,6,10,16,25,35,50,70,95,120,150,185,240])addAmpacityRow(area);
$('#add-ampacity-row').onclick=()=>{addAmpacityRow();reset();};
function engineeringContext(){
 let conditions=$('#conditions').value;let table='';
 if(selected==='automatic'&&!Array.from(document.querySelectorAll('.ampacity-cell')).some(input=>input.value.trim()))return {};
 if(selected==='sizing'||selected==='automatic'){
 const fields=[['site-conductor','도체'],['site-insulation','절연'],['site-method','포설 방식'],['site-temperature','주위 온도 (℃)'],['site-circuits','집합 회로 수'],['site-loaded','부하 도체 수']];
 const entries=fields.map(([id,label])=>{const value=$('#'+id).value.trim();if(!value)throw Error(label+' 항목을 입력하세요.');return [label,value];});
 if(!Number.isFinite(Number($('#site-temperature').value)))throw Error('주위 온도를 확인하세요.');
 for(const id of ['site-circuits','site-loaded']){const value=Number($('#'+id).value);if(!Number.isInteger(value)||value<1)throw Error('회로 수와 부하 도체 수는 양의 정수로 입력하세요.');}
 if(entries.some(([,v])=>v.includes('기타'))&&!conditions.trim())throw Error('기타로 선택한 조건은 비고에 기재하세요.');
 conditions=entries.map(([label,value])=>label+': '+value).join(', ')+(conditions.trim()?'; 비고: '+conditions.trim():'');
 const rows=[];for(const row of document.querySelectorAll('#ampacity-rows tr')){const area=row.querySelector('.area-cell').value.trim(),current=row.querySelector('.ampacity-cell').value.trim();if(!current)continue;if(!area)throw Error('허용전류를 입력한 행의 전선 굵기도 입력하세요.');rows.push(area+','+current);}table=rows.join('\n');
 if(!table)throw Error('허용전류표에 한 개 이상의 굵기와 허용전류를 입력하세요.');
 }
 return {source:$('#source').value,conditions,table};
}

function reset(){ $('#status').textContent='입력 대기';$('#results').innerHTML='<div class="empty">⌁<p>입력값을 확인하고<br>계산하기를 눌러주세요.</p></div>';$('#formula').textContent='계산 후 적용한 공식이 표시됩니다.';$('#note').textContent='계산값은 설계 검토를 위한 참고값입니다.';$('#error').textContent='';}
function updatePhaseHint(){const hint={1:'단상 2선식: 부하 양단 전압과 단상 부하 전력을 입력하세요.',3:'삼상 3선식: 선간전압과 삼상 전체 전력을 입력하세요. 평형 부하 기준입니다.',4:'삼상 4선식: 선간전압(예: 380V)과 삼상 전체 전력을 입력하세요. 상전압은 선간전압/√3입니다. 단상 분기 부하는 단상 2선식에서 상전압으로 계산하세요. 불평형·중성선 고조파는 포함하지 않습니다.'};$('#phase-hint').textContent=hint[phase];const label=$('label[for="voltage"]');if(label)label.textContent=phase==='1'?'부하 양단 전압':'선간전압';}
function select(key){selected=key;const d=definitions[key];$('#auto-scope').hidden=!d.automatic;$('#title').textContent=d.title;$('#description').textContent=d.desc;$('#phase-wrap').hidden=!d.phase;$('#fields').replaceChildren();$('#advanced-fields').replaceChildren();$('#auto-settings').hidden=!d.automatic;d.fields.forEach(([key,label,unit,value],i)=>{const box=document.createElement('div');box.innerHTML=`<label for="${key}">${label}</label><div class="input-box"><input id="${key}" name="${key}" type="number" step="any" required value="${value}"><span>${unit}</span></div>`;(d.automatic&&i>=3?$('#advanced-fields'):$('#fields')).append(box);});$('#engineering-context').hidden=!(d.engineering||d.automatic);$('#reference-settings').open=!d.automatic;$('#reference-settings').hidden=!(d.engineering||d.automatic);$('#table-wrap').hidden=!(d.table||d.automatic);$('#site-fields').hidden=!['sizing','automatic'].includes(key);$('#conditions-label').textContent=['sizing','automatic'].includes(key)?'비고 (선택)':'현장 적용 조건';$('#conditions').placeholder=['sizing','automatic'].includes(key)?'전선 제품명, 기준 공사방법, 배치·간격, 기타 조건 등':'접지계통, 보호장치 모델, 계통 구성 등';document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('selected',b.dataset.key===key));updatePhaseHint();reset();}
document.querySelectorAll('[data-phase]').forEach(b=>b.onclick=()=>{phase=b.dataset.phase;document.querySelectorAll('[data-phase]').forEach(x=>x.classList.toggle('active',x===b));updatePhaseHint();reset();});
$('#form').addEventListener('input',reset);$('#form').addEventListener('change',reset);
$('#form').onsubmit=e=>{e.preventDefault();reset();try{const values={};for(const [key] of definitions[selected].fields){const raw=$(`[name="${key}"]`).value;values[key]=raw.trim()===''?NaN:Number(raw);}const result=calculate(selected,values,phase,engineeringContext());$('#results').replaceChildren();result.rows.forEach((r,i)=>{const div=document.createElement('div');div.className='result-item'+(i===0?' primary':'');div.innerHTML=`<span>${r.label}</span><div><strong>${r.value.toLocaleString('ko-KR',{maximumFractionDigits:2})}</strong> <small>${r.unit}</small></div>`;$('#results').append(div);});$('#formula').textContent=result.formula;$('#note').textContent=result.note||'정현파 정상상태, 평형 삼상 부하를 가정합니다. 실제 설비 조건을 함께 확인하세요.';$('#status').textContent=selected==='automatic'&&result.note.startsWith('[전류밀도')?'개략 추정':'계산 완료';}catch(err){$('#error').textContent=err.message;$('#status').textContent='입력 확인';}};
$('#print').onclick=()=>window.print();select(selected);
