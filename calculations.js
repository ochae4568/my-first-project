import {engineeringDefinitions, calculateEngineering} from './engineering.js';
export const definitions = {
 feeder: { title:'간선 통합 계산', desc:'부하전류와 배선의 전압강하를 한 번에 확인하세요.', fields:[['power','부하 유효전력','kW',30],['voltage','전압','V',380],['pf','역률','0~1',0.9],['length','편도 배선거리','m',50],['area','전선 단면적','mm²',16]], phase:true },
 current:{title:'부하전류',desc:'단상·삼상 부하의 운전전류를 계산합니다.',fields:[['power','입력 유효전력','kW',30],['voltage','전압','V',380],['pf','역률','0~1',0.9]],phase:true},
 power:{title:'전력 계산',desc:'전압과 전류로 유효·피상·무효전력을 계산합니다.',fields:[['voltage','전압','V',380],['current','전류','A',50],['pf','역률','0~1',0.9]],phase:true},
 drop:{title:'전압강하',desc:'구리 도체의 저항 성분으로 전압강하를 추정합니다.',fields:[['voltage','전압','V',380],['current','부하전류','A',50],['length','편도 배선거리','m',50],['area','전선 단면적','mm²',16]],phase:true},
 capacitor:{title:'역률 개선',desc:'목표 역률에 필요한 보상 무효전력을 계산합니다.',fields:[['power','유효전력','kW',100],['pf','현재 역률','0~1',0.75],['target','목표 역률','0~1',0.95]]},
 transformer:{title:'변압기 용량',desc:'부하와 계획 부하율에 따른 필요 피상용량입니다.',fields:[['power','최대 유효부하','kW',100],['pf','역률','0~1',0.9],['loading','계획 부하율','0~1',0.8]]},
 motor:{title:'전동기 전류',desc:'축 출력에 효율과 역률을 반영합니다.',fields:[['power','전동기 축 출력','kW',15],['voltage','전압','V',380],['pf','역률','0~1',0.85],['efficiency','효율','0~1',0.9]],phase:true},
 lighting:{title:'조명 수량',desc:'광속법으로 필요한 기구 수량을 추정합니다.',fields:[['lux','목표 조도','lx',300],['space','바닥 면적','m²',100],['flux','기구당 광속','lm',4000],['utilization','조명률','0~1',0.6],['maintenance','유지율','0~1',0.8]]},
 conduit:{title:'배관 점유율',desc:'외경과 관 내경으로 기하학적 점유율을 계산합니다.',fields:[['diameter','전선 외경 (동일 규격)','mm',8],['count','전선 가닥 수','개',4],['inner','전선관 실제 내경','mm',28]]},
 solar:{title:'태양광 스트링',desc:'온도계수를 반영한 저온 개방전압을 확인합니다.',fields:[['voc','모듈 개방전압 Voc','V',49],['coefficient','Voc 온도계수 (부호 포함)','%/°C',-0.28],['temperature','최저 모듈 온도','°C',-10],['series','직렬 모듈 수','개',12],['limit','인버터 최대 DC 전압','V',1000]]},
 material:{title:'케이블 물량·금액',desc:'경로 수와 여유율을 반영한 자재 금액입니다.',fields:[['length','경로당 길이','m',50],['count','동일 경로 수','개',3],['spare','여유율','%',10],['price','미터당 단가','원/m',5000]]}
};
Object.assign(definitions,engineeringDefinitions);
export function calculate(kind,v,phase='3',context={}) {
 if(engineeringDefinitions[kind])return calculateEngineering(kind,v,{...context,phase});
 const d=definitions[kind]; if(!d)throw Error('계산 항목을 선택하세요.');
 for(const [key,label] of d.fields){if(!Number.isFinite(v[key]))throw Error(`${label} 값을 입력하세요.`); if(!['coefficient','temperature','spare'].includes(key)&&v[key]<=0)throw Error(`${label}은 0보다 커야 합니다.`);}
 for(const key of ['pf','target','loading','efficiency','utilization','maintenance'])if(key in v&&(v[key]<=0||v[key]>1))throw Error('역률·효율·비율은 0 초과 1 이하로 입력하세요.');
 for(const key of ['count','series'])if(key in v&&!Number.isInteger(v[key]))throw Error('수량은 정수로 입력하세요.');
 if('spare' in v&&v.spare<0)throw Error('여유율은 0 이상이어야 합니다.');
 if(d.phase&&!['1','3','4'].includes(phase))throw Error('전원 방식을 선택하세요.');
 const threePhase=phase==='3'||phase==='4';
 const k=threePhase?Math.sqrt(3):1, wire=threePhase?Math.sqrt(3):2;
 const row=(label,value,unit)=>({label,value,unit}); let rows=[],formula='',note='';
 if(['current','feeder','motor'].includes(kind)){
 const i=v.power*1000/(k*v.voltage*v.pf*(v.efficiency??1));rows.push(row('계산 부하전류',i,'A'));formula='I = P × 1000 / (k × V × cosφ × η), 삼상 k=√3, 단상 k=1';
 if(kind==='feeder'){const drop=wire*0.0175*v.length*i/v.area;rows.push(row('추정 전압강하',drop,'V'),row('전압강하율',drop/v.voltage*100,'%'));formula+='; ΔV = c × ρ × L × I / A';}
 note='전력은 입력 유효전력 기준입니다. 전동기 항목만 축 출력과 효율을 사용합니다. 차단기·전선 자동 선정은 하지 않습니다.';
 }else if(kind==='power'){const s=k*v.voltage*v.current/1000;rows=[row('유효전력',s*v.pf,'kW'),row('피상전력',s,'kVA'),row('무효전력 (크기)',s*Math.sqrt(1-v.pf**2),'kvar')];formula='S = kVI / 1000; P = S cosφ; |Q| = S√(1−cos²φ)';}
 else if(kind==='drop'){const drop=wire*0.0175*v.length*v.current/v.area;rows=[row('추정 전압강하',drop,'V'),row('전압강하율',100*drop/v.voltage,'%')];formula='ΔV = cρLI/A; 삼상 c=√3, 단상 c=2';}
 else if(kind==='capacitor'){if(v.target<v.pf)throw Error('목표 역률은 현재 역률 이상이어야 합니다.');rows=[row('필요 보상용량',v.power*(Math.tan(Math.acos(v.pf))-Math.tan(Math.acos(v.target))),'kvar')];formula='Qc = P × (tanφ₁ − tanφ₂)';note='지상 부하 가정. 고조파·공진 및 실제 콘덴서 정격은 별도 검토합니다.';}
 else if(kind==='transformer'){rows=[row('필요 피상용량',v.power/v.pf/v.loading,'kVA')];formula='S = P / (cosφ × 계획 부하율)';note='표준 정격 추천이 아닙니다. 기동부하·고조파·증설 여유는 별도 반영하세요.';}
 else if(kind==='lighting'){rows=[row('필요 기구 수량',Math.ceil(v.lux*v.space/(v.flux*v.utilization*v.maintenance)),'개')];formula='N = 올림(E × 면적 / (기구 광속 × 조명률 × 유지율))';note='평균 조도 추정치입니다. 균제도와 실제 배치는 별도 검토하세요.';}
 else if(kind==='conduit'){rows=[row('기하학적 점유율',v.count*(v.diameter/v.inner)**2*100,'%')];formula='점유율 = 가닥 수 × (전선 외경 / 관 내경)² × 100';note='동일 외경의 원형 전선 가정. 허용 점유율 판정과 관 규격 선정은 포함하지 않습니다.';}
 else if(kind==='solar'){const voc=v.voc*(1+v.coefficient/100*(v.temperature-25));if(voc<=0)throw Error('온도 보정 후 전압이 양수가 되도록 입력하세요.');rows=[row('저온 스트링 Voc',voc*v.series,'V'),row('최대 DC 전압 대비 여유',v.limit-voc*v.series,'V')];formula='Voc(T) = Voc(STC) × [1 + β/100 × (T − 25)]; 스트링 Voc = Voc(T) × 직렬 수';note='음수 여유는 최대 전압 초과입니다. MPPT 범위·전류·병렬 구성·제조사 설계 조건은 별도 검토하세요.';}
 else if(kind==='material'){const length=v.length*v.count*(1+v.spare/100);rows=[row('총 케이블 길이',length,'m'),row('예상 자재비',length*v.price,'원')];formula='길이 = 경로 길이 × 경로 수 × (1 + 여유율/100); 금액 = 길이 × 단가';note='노무비·부가세·부속 자재는 제외합니다.';}
 if(['drop','feeder'].includes(kind))note+=' 구리 20°C 비저항 ρ=0.0175 Ω·mm²/m, 리액턴스 및 역률에 따른 위상 효과를 생략한 저항 기반 추정입니다. 허용 전압강하 판정은 하지 않습니다.';
 if(d.phase){
 const system=phase==='1'?'단상 2선식':phase==='3'?'삼상 3선식':'삼상 4선식';
 note=`${system}. ${threePhase?'전압은 선간전압, 전력은 삼상 합계이며 평형 정현파 부하 기준입니다. ':''}`+note;
 if(phase==='4'){
 rows.push(row('상전압 (선–중성선)',v.voltage/Math.sqrt(3),'V'));
 if(['feeder','drop'].includes(kind)){const lineDrop=rows.find(r=>r.label==='추정 전압강하');lineDrop.label='선간 전압강하';rows.push(row('상 전압강하 (선–중성선)',lineDrop.value/Math.sqrt(3),'V'));formula+='; ΔV상 = ΔV선간 / √3';}
 note+=' 삼상 4선식의 평형 부하에서는 중성선 기본파 전류를 0으로 가정합니다. 불평형 부하·고조파·중성선 전압강하 및 중성선 굵기는 별도 검토하세요. 단상 분기 부하는 단상 2선식으로 상전압을 입력하세요.';
 }
 }
 if(rows.some(r=>!Number.isFinite(r.value)))throw Error('계산 범위를 벗어났습니다. 입력값을 확인하세요.');
 return {rows,formula,note};
}
