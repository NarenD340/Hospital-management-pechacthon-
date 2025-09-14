
// app.js - simulation + predictive analytics

const ctxs = {
  oxygen: document.getElementById('oxygenChart').getContext('2d'),
  beds: document.getElementById('bedsChart').getContext('2d'),
  staff: document.getElementById('staffChart').getContext('2d'),
};

const valuesEl = {
  oxygen: document.getElementById('oxygenValue'),
  beds: document.getElementById('bedsValue'),
  staff: document.getElementById('staffValue')
};

const predictionTable = document.getElementById('predictionTable');

let simInterval = 1500;
let simHandle = null;
let running = true;

let state = { oxygen: 12000, beds: 25, staff: 40 };
const HISTORY_LIMIT = 60;
let history = { oxygen: [], beds: [], staff: [] };

function pushData(key, value){
  history[key].push({ t: Date.now(), v: value });
  if (history[key].length > HISTORY_LIMIT) history[key].shift();
}

function simulateStep(){
  const bedOccupancy = Math.max(0, (100 - (state.beds*3)));
  const oxygenUse = 20 + Math.random()*30 + bedOccupancy*0.5;
  state.oxygen = Math.max(0, state.oxygen - oxygenUse);

  const changeBeds = (Math.random() < 0.48 ? -1 : 1) * (Math.random() < 0.7 ? 1 : 0);
  state.beds = Math.max(0, Math.min(100, state.beds + changeBeds));

  const staffDrift = (Math.random() < 0.98 ? 0 : (Math.random()<0.5?-1:1));
  state.staff = Math.max(5, Math.min(200, state.staff + staffDrift));

  if (Math.random() < 0.02){
    state.beds = Math.max(0, state.beds - Math.floor(2 + Math.random()*6));
    state.oxygen = Math.max(0, state.oxygen - (100 + Math.random()*400));
  }

  pushData('oxygen', state.oxygen);
  pushData('beds', state.beds);
  pushData('staff', state.staff);
  updateUI();
}

let charts = {};
function updateUI(){
  valuesEl.oxygen.textContent = Math.round(state.oxygen).toLocaleString();
  valuesEl.beds.textContent = Math.round(state.beds);
  valuesEl.staff.textContent = Math.round(state.staff);

  const labels = history.oxygen.map(h => new Date(h.t).toLocaleTimeString());
  const oxygenData = history.oxygen.map(h=>Math.round(h.v));
  const bedsData = history.beds.map(h=>Math.round(h.v));
  const staffData = history.staff.map(h=>Math.round(h.v));

  const updateChart = (chart, ctx, label, data) => {
    if (!chart){
      return new Chart(ctx, {
        type: 'line',
        data: { labels, datasets:[{label, data, tension:0.3, fill:true}] },
        options:{responsive:true, plugins:{legend:{display:false}}}
      });
    } else {
      chart.data.labels = labels;
      chart.data.datasets[0].data = data;
      chart.update();
      return chart;
    }
  };

  charts.oxygen = updateChart(charts.oxygen, ctxs.oxygen, 'Oxygen (L)', oxygenData);
  charts.beds = updateChart(charts.beds, ctxs.beds, 'Beds', bedsData);
  charts.staff = updateChart(charts.staff, ctxs.staff, 'Staff', staffData);

  computeAndShowPredictions();
}

function linearPredict(series, steps=6){
  if (!series || series.length < 3) return Array(steps).fill(series.at(-1)||0);
  const n = series.length;
  const x = Array.from({length:n}, (_,i)=>i);
  const y = series.slice();
  const xMean = x.reduce((a,b)=>a+b,0)/n;
  const yMean = y.reduce((a,b)=>a+b,0)/n;
  let num=0, den=0;
  for (let i=0;i<n;i++){ num += (x[i]-xMean)(y[i]-yMean); den += (x[i]-xMean)*2; }
  const slope = den===0 ? 0 : num/den;
  const intercept = yMean - slope*xMean;
  return Array.from({length:steps}, (_,s)=>Math.max(0, Math.round(intercept + slope*(n-1+s+1))));
}

function computeAndShowPredictions(){
  const predsO = linearPredict(history.oxygen.map(h=>h.v),6);
  const predsB = linearPredict(history.beds.map(h=>h.v),6);
  const predsS = linearPredict(history.staff.map(h=>h.v),6);

  predictionTable.innerHTML = '';
  for (let i=0;i<6;i++){
    const div = document.createElement('div');
    div.className = 'pred-item';
    div.innerHTML = `<strong>t+${i+1}</strong><br>
      Oxygen: ${predsO[i].toLocaleString()} L<br>
      Beds: ${predsB[i]}<br>
      Staff: ${predsS[i]}<br>`;
    predictionTable.appendChild(div);
  }
}

document.getElementById('speed').addEventListener('change', (e)=>{
  simInterval = parseInt(e.target.value,10);
  if (running){ clearInterval(simHandle); simHandle = setInterval(simulateStep, simInterval); }
});
document.getElementById('toggleSim').addEventListener('click', (e)=>{
  running = !running;
  e.target.textContent = running ? 'Pause' : 'Resume';
  if (running) simHandle = setInterval(simulateStep, simInterval);
  else clearInterval(simHandle);
});
document.getElementById('reset').addEventListener('click', ()=>{
  history = { oxygen: [], beds: [], staff: [] };
  state = { oxygen:12000, beds:25, staff:40 };
  charts && Object.values(charts).forEach(c=>{ try{ c.destroy(); }catch(e){} });
  charts = {};
  simulateStep();
});

(function seed(){
  for (let i=0;i<18;i++){
    pushData('oxygen', state.oxygen - i*20 + Math.random()*60);
    pushData('beds', state.beds + Math.round(Math.sin(i/3)*2));
    pushData('staff', state.staff + Math.round((Math.random()*2-1)));
  }
  updateUI();
  simHandle = setInterval(simulateStep, simInterval);
})();



 
