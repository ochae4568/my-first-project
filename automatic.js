export const automaticDefinition={title:'용량으로 차단기·전선 선정',desc:'용량·전압·거리 입력 → 부하전류 → 차단기 정격 후보 → 전선 굵기 후보',phase:true,automatic:true,fields:[['power','부하 용량 (입력 유효전력)','kW',30],['voltage','전압','V',380],['length','편도 배선거리','m',50],['pf','역률','0~1',0.9],['margin','설계 전류 여유배수 (사용자 가정)','배',1],['density','개략 설계 전류밀도','A/mm²',3],['dropLimit','설계 허용 전압강하율','%',3],['rho','운전온도 도체 비저항','Ω·mm²/m',0.0225],['temperatureFactor','표 적용 시 온도 보정계수','배',1],['groupFactor','표 적용 시 집합 보정계수','배',1],['otherFactor','표 적용 시 기타 보정계수','배',1],['i2Factor','표 적용 시 I₂/In (제조사 확인)','배',1.45]]};
export const breakerCandidates=[6,10,16,20,25,32,40,50,63,80,100,125,160,200,250,320,400,500,630,800,1000,1250,1600,2000,2500,3200];
export const conductorCandidates=[1.5,2.5,4,6,10,16,25,35,50,70,95,120,150,185,240,300,400,500,630];
export function automaticInputs(v,phase){
 for(const [key,label] of automaticDefinition.fields)if(!Number.isFinite(v[key])||v[key]<=0)throw Error(`${label}은 0보다 큰 값으로 입력하세요.`);
 if(!['1','3','4'].includes(phase))throw Error('전원 방식을 선택하세요.');
 if(v.voltage>1000)throw Error('자동 후보 계산은 교류 저압 1,000V 이하용입니다.');
 if(v.pf>1||v.dropLimit>100||v.margin<1||v.i2Factor<1)throw Error('역률 ≤ 1, 전압강하율 ≤ 100, 여유배수 ≥ 1, I₂/In ≥ 1 조건을 확인하세요.');
 const ib=v.power*1000/((phase==='1'?1:Math.sqrt(3))*v.voltage*v.pf),design=ib*v.margin;
 const rating=breakerCandidates.find(n=>n>=design);
 if(!rating)throw Error('차단기 후보 정격 범위를 초과했습니다. 병렬·분할 회로 설계가 필요합니다.');
 if(!Number.isFinite(ib)||!Number.isFinite(design))throw Error('계산 범위를 벗어났습니다.');
 return {ib,design,rating};
}
export function calculateAutomatic(v,phase,context,sizing){
 const {ib,design,rating}=automaticInputs(v,phase);
 const row=(label,value,unit)=>({label,value,unit});
 const header=[row('부하전류',ib,'A'),row('여유 반영 설계전류',design,'A'),row('차단기 정격전류 후보',rating,'A')];
 if(context.table?.trim()){
 const sized=sizing('sizing',{ib:design,rating,i2:rating*v.i2Factor,temperatureFactor:v.temperatureFactor,groupFactor:v.groupFactor,otherFactor:v.otherFactor,voltage:v.voltage,length:v.length,dropLimit:v.dropLimit,rho:v.rho},{...context,phase});
 return {...sized,rows:[...header,...sized.rows],formula:'Ib = 1000P/(kU cosφ); 설계전류 = Ib × 여유배수; In = 설계전류 이상인 후보 정격; '+sized.formula,note:'[입력 허용전류표 기반 후보] '+sized.note+' 차단기의 극수·차단용량·동작곡선·기동 특성은 별도 검토하세요. 여유배수는 사용자 가정이며 법정 일괄 계수가 아닙니다.'};
 }
 const c=phase==='1'?2:Math.sqrt(3),drop=area=>c*v.rho*v.length*ib/area;
 const candidate=conductorCandidates.find(area=>area>=rating/v.density&&drop(area)/v.voltage*100<=v.dropLimit);
 if(!candidate)throw Error('현재 전류밀도·거리·전압강하 조건을 만족하는 단일 전선 후보가 없습니다.');
 return {rows:[...header,row('개략 전선 단면적 후보',candidate,'mm²'),row('저항 기반 전압강하',drop(candidate),'V'),row('전압강하율',drop(candidate)/v.voltage*100,'%')],formula:'Ib = 1000P/(kU cosφ); In = Ib × 여유배수 이상 후보; A ≥ In/J; ΔV = cρLIb/A; ΔV/U × 100 ≤ 허용률',note:`[전류밀도 기반 개략 추정 · KEC 허용전류 검증 전] ${phase==='1'?'단상 2선식':'평형 삼상 '+(phase==='4'?'4':'3')+'선식'}, 역률 ${v.pf}, 여유배수 ${v.margin}, 설계 전류밀도 J=${v.density} A/mm², 비저항 ${v.rho} Ω·mm²/m, 허용 전압강하 ${v.dropLimit}%. J는 사용자 설계 가정이며 공식 허용전류가 아닙니다. 포설·온도·집합에 대한 허용전류와 과부하 보호 적합성은 검증하지 않았습니다. 설치용 최종 선정에는 상세 설정에서 현장 허용전류표를 입력하세요. 저항 기반 추정은 리액턴스·역률 위상 효과를 생략합니다. 차단용량·극수·보호곡선·기동전류·단락 열내량·중성선은 별도 검토하세요. 기본 비저항은 구리 약 90°C의 예시이며 재질·온도에 맞게 변경하세요.`};
}
