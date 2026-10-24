export const engineeringDefinitions = {
 hvIncoming:{title:'특고압 수전·변압기',desc:'22.9kV 등 특고압 수전전류와 변압기 양측 정격전류를 계산합니다.',engineering:true,fields:[['primaryKv','수전 선간전압','kV',22.9],['power','수전 유효부하 (삼상 합계)','kW',800],['pf','수전 역률','0~1',0.9],['kva','변압기 정격용량','kVA',1000],['secondary','변압기 2차 선간전압','V',380]]},
 hvFault:{title:'특고압 단락·차단용량',desc:'수전점 삼상 단락용량 자료로 대칭 단락전류와 차단기 정격을 비교합니다.',engineering:true,fields:[['primaryKv','수전점 선간전압','kV',22.9],['faultMva','수전점 삼상 단락용량','MVA',500],['breakerKv','차단기 정격전압','kV',25.8],['breaking','해당 조건 정격 대칭 차단전류','kA',12.5]]},
 hvCharging:{title:'특고압 케이블 충전',desc:'대지 정전용량으로 정상 충전전류와 충전 무효전력을 계산합니다.',engineering:true,fields:[['primaryKv','선간전압','kV',22.9],['frequency','주파수','Hz',60],['capacitance','상당 대지 정전용량','μF/km',0.2],['routeLength','편도 케이블 경로 길이','km',1],['circuits','동일 병렬 회선 수','회선',1]]},
 sizing:{title:'전선·차단기 협조',desc:'적용 기준표의 허용전류와 보정계수로 후보 전선을 검토합니다.',engineering:true,table:true,fields:[['ib','설계전류 Ib','A',50],['rating','차단기 정격 In','A',63],['i2','차단기 규약동작전류 I₂','A',81.9],['temperatureFactor','온도 보정계수','배',0.9],['groupFactor','집합 보정계수','배',0.8],['otherFactor','기타 보정계수','배',1]]},
 fault:{title:'계통 단락전류',desc:'삼상 평형 계통의 전원·변압기·케이블 임피던스를 합산합니다.',engineering:true,fields:[['voltage','변압기 2차 선간전압','V',380],['kva','변압기 정격','kVA',500],['uk','변압기 임피던스','%',5],['xr','변압기 X/R','배',5],['sourceMva','상위계통 단락용량','MVA',250],['sourceXr','상위계통 X/R','배',10],['c','전압계수 c','배',1.05],['length','2차 케이블 편도 길이','m',30],['resistance','운전온도 케이블 R','Ω/km',0.2],['reactance','케이블 X','Ω/km',0.08],['breaking','동일 전압 차단용량','kA',25]]},
 pe:{title:'보호도체 열적 검토',desc:'단열식으로 고장전류와 차단시간에 대한 단면적을 검토합니다.',engineering:true,fields:[['fault','보호도체 통과 고장전류','A',5000],['time','보호장치 총 차단시간','s',0.2],['thermalK','재질·절연·온도별 계수 k','A√s/mm²',115],['section','검토 보호도체 단면적','mm²',25]]},
 earthing:{title:'접지·자동차단 검토',desc:'TN 고장루프 및 TT의 RCD 접촉전압 조건을 각각 검토합니다.',engineering:true,fields:[['u0','대지전압 U₀','V',220],['zs','TN 고장루프 임피던스 Zs','Ω',0.5],['ia','요구 시간 내 동작전류 Ia','A',320],['ra','TT 접지저항 RA','Ω',100],['idn','TT RCD 정격감도전류','mA',30],['ul','적용 허용 접촉전압 UL','V',50]]}
};
const result=(rows,formula,note)=>({rows,formula,note});
const r=(label,value,unit)=>({label,value,unit});
export function calculateEngineering(kind,v,context={}){
 const d=engineeringDefinitions[kind];
 if(!context.source?.trim()||!context.conditions?.trim())throw Error('적용 기준 판본·표/자료 출처와 현장 적용 조건을 입력하세요.');
 for(const [key,label] of d.fields){if(!Number.isFinite(v[key])||v[key]<=0)throw Error(`${label}은 0보다 큰 유한수로 입력하세요.`);}
 if(kind.startsWith('hv')&&v.primaryKv<=7)throw Error('특고압 항목은 7kV 초과 선간전압을 입력하세요. 저압·고압은 다른 계산 항목을 사용하세요.');
 if(kind==='hvIncoming'&&v.pf>1)throw Error('역률은 0 초과 1 이하로 입력하세요.');
 if(kind==='hvCharging'&&!Number.isInteger(v.circuits))throw Error('회선 수는 양의 정수로 입력하세요.');
 let out;
 if(kind==='hvIncoming'){
 const s=v.power/v.pf,load=s/v.kva*100;
 out=result([r('수전 부하전류',v.power/(Math.sqrt(3)*v.primaryKv*v.pf),'A'),r('부하 피상전력',s,'kVA'),r('변압기 1차 정격전류',v.kva/(Math.sqrt(3)*v.primaryKv),'A'),r('변압기 2차 정격전류',v.kva*1000/(Math.sqrt(3)*v.secondary),'A'),r('정격 대비 부하율',load,'%')], 'I부하 = P(kW)/(√3 U(kV) cosφ); I₁ = S(kVA)/(√3 U₁(kV)); I₂ = 1000S/(√3 U₂(V))',`평형 삼상 정현파 기준입니다. 부하는 수전점 입력 유효전력입니다. ${load>100?'입력 부하가 변압기 정격용량을 초과합니다.':'입력 부하 피상전력이 변압기 정격 이하입니다.'} 변압기 손실·기동·고조파·병렬운전·온도 및 여유용량은 포함하지 않습니다. 이 결과만으로 변압기나 특고압 전선·개폐기를 선정하지 않습니다.`);
 }else if(kind==='hvFault'){
 const ik=v.faultMva/(Math.sqrt(3)*v.primaryKv);
 out=result([r('수전점 삼상 대칭 단락전류',ik,'kA'),r('입력 차단전류 대비 여유',v.breaking-ik,'kA'),r('차단기 정격전압 대비 여유',v.breakerKv-v.primaryKv,'kV')], 'Ik(kA) = Sk(MVA)/(√3 U(kV))',`단락용량 자료와 전압은 동일 수전점·동일 해석 조건이어야 합니다. 전압계수가 반영된 단락용량을 사용하며 별도 중복 보정하지 않습니다. 전류 크기 비교: ${v.breaking>=ik?'입력 정격 이상':'입력 정격 부족'}. 전압 크기 비교: ${v.breakerKv>=v.primaryKv?'입력 정격 이상':'입력 정격 부족'}. 단순 크기 비교이며 차단기 적합 판정이 아닙니다. 최고사용전압·절연레벨·TRV·투입 피크·단시간 내전류·X/R·고장지속시간·전원 기여와 보호계전 협조는 별도 검토합니다.`);
 }else if(kind==='hvCharging'){
 const c=v.capacitance*1e-6*v.routeLength*v.circuits,u=v.primaryKv*1000,omega=2*Math.PI*v.frequency;
 out=result([r('전체 상당 정전용량',c*1e6,'μF'),r('상당 정상 충전전류',omega*c*u/Math.sqrt(3),'A'),r('삼상 충전 무효전력 (진상)',omega*c*u*u/1000,'kvar')], 'C = C₀ × L × 회선 수; Ic = 2πfC × U/√3; Qc = 2πfC × U²', '제조사 케이블 대지 정전용량(상당)을 사용하세요. 평형 삼상·정상상태 기준이며 3상 가닥 수를 다시 곱하지 않습니다. 병렬 회선은 동종·동일 길이를 가정합니다. 지락전류·ZCT 검출전류·보호계전기 정정값이 아니며 중성점 접지방식과 전체 계통 대지 정전용량에 따른 별도 해석이 필요합니다.');
 }else if(kind==='sizing'){
 const entries=(context.table??'').trim().split('\n').map(line=>line.trim().split(',').map(Number));
 if(!entries.length||entries.some(a=>a.length!==2||a.some(n=>!Number.isFinite(n)||n<=0)))throw Error('허용전류표를 단면적,허용전류 형식으로 입력하세요.');
 if(new Set(entries.map(a=>a[0])).size!==entries.length)throw Error('단면적이 중복된 행을 제거하세요.');
 if(v.i2<v.rating)throw Error('I₂는 차단기 정격 In 이상이어야 합니다. 제조사 특성을 확인하세요.');
 entries.sort((a,b)=>a[0]-b[0]);
 const factor=v.temperatureFactor*v.groupFactor*v.otherFactor;
 const candidate=entries.find(([area,base])=>v.ib<=v.rating&&v.rating<=base*factor&&v.i2<=1.45*base*factor);
 const required=Math.max(v.rating,v.i2/1.45);
 out=result([r('보정계수 곱',factor,'배'),r('필요 보정 허용전류',required,'A'),...(candidate?[r('입력 표 내 최소 후보',candidate[0],'mm²'),r('후보 보정 허용전류 Iz',candidate[1]*factor,'A')]:[])], 'Iz = 표 허용전류 × 온도 × 집합 × 기타; Ib ≤ In ≤ Iz 및 I₂ ≤ 1.45 Iz',candidate?'입력 표 내 과부하 보호 두 조건을 만족합니다. 전압강하·단락 열내량·기계적 최소 단면적·차단시간 및 제조사 조건은 별도 검토해야 합니다.':'입력 표에서 두 조건을 만족하는 후보가 없습니다. 설계전류·차단기와 기준표를 확인하세요.');
 }else if(kind==='fault'){
 const zt=v.voltage**2/(v.kva*1000)*v.uk/100,ztR=zt/Math.hypot(1,v.xr),zs=v.voltage**2/(v.sourceMva*1e6),zsR=zs/Math.hypot(1,v.sourceXr);
 const totalR=ztR+zsR+v.resistance*v.length/1000,totalX=ztR*v.xr+zsR*v.sourceXr+v.reactance*v.length/1000;
 const ik=v.c*v.voltage/(Math.sqrt(3)*Math.hypot(totalR,totalX))/1000;
 out=result([r('총 등가 저항 R',totalR,'Ω'),r('총 등가 리액턴스 X',totalX,'Ω'),r('삼상 대칭 단락전류 추정',ik,'kA'),r('입력 차단용량 대비 여유',v.breaking-ik,'kA')], 'Zt = uk/100 × U²/S; Zs = U²/Sk; Z = ΣR + jΣX; Ik = cU/(√3 |Z|)',`${v.breaking>=ik?'입력 차단용량이 계산 전류 이상입니다.':'입력 차단용량이 계산 전류보다 작습니다.'} 단일 전원 방사상 저압계통의 임피던스법 추정입니다. 상위계통 단락용량은 c 보정 전 등가임피던스 환산 기준입니다. 병렬 전원·모터·발전기·인버터 기여, 피크·비대칭 전류와 최소 고장전류를 포함하지 않으며 IEC 60909 전체 적합 계산이 아닙니다.`);
 }else if(kind==='pe'){
 if(v.time>5)throw Error('단열식 적용 시간은 5초 이하로 제한합니다. 다른 조건은 별도 검토하세요.');
 const minimum=v.fault*Math.sqrt(v.time)/v.thermalK;
 out=result([r('열적 필요 단면적',minimum,'mm²'),r('검토 단면적',v.section,'mm²'),r('단면적 여유',v.section-minimum,'mm²')],'S ≥ I√t / k',`${v.section>=minimum?'입력 조건의 단열식 열적 조건 충족.':'입력 조건의 단열식 열적 조건 미충족.'} k는 도체·절연·초기/최종 온도에 맞는 표 값을 사용하세요. 고장전류는 해당 도체 통과 전류, 시간은 총 차단시간입니다. 기계적 최소값 및 비단열 조건은 별도 검토합니다.`);
 }else{
 const tn=v.zs*v.ia,tt=v.ra*v.idn/1000;
 out=result([r('TN Zs × Ia',tn,'V'),r('TT RA × IΔn',tt,'V')],'TN: Zs × Ia ≤ U₀; TT(RCD): RA × IΔn ≤ UL',`TN 입력 조건: ${tn<=v.u0?'충족':'미충족'}, TT 입력 조건: ${tt<=v.ul?'충족':'미충족'}. 서로 다른 접지계통을 위한 독립 검토입니다. Ia는 해당 회로의 요구 차단시간에 대응하는 제조사 동작전류를 입력하세요. TT의 실제 차단시간·RCD 형식, 보호등전위본딩 등은 별도 확인해야 하며 이 결과만으로 전체 자동차단 적합을 판정하지 않습니다.`);
 }
 if(out.rows.some(row=>!Number.isFinite(row.value)))throw Error('계산 범위를 벗어났습니다.');
 out.note+=` 적용 자료: ${context.source.trim()}. 현장 조건: ${context.conditions.trim()}. 입력 자료의 적합성은 자동 인증되지 않습니다.`;
 return out;
}
