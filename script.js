document.addEventListener('DOMContentLoaded', () => {

    // DOM Elements
    const inputs = {
        roomArea: document.getElementById('roomArea'),
        roomHeight: document.getElementById('roomHeight'),
        heatingLoad: document.getElementById('heatingLoad'),
        coolingLoad: document.getElementById('coolingLoad'),
        roomTemp: document.getElementById('roomTemp'),
        volumeFlowSlider: document.getElementById('volumeFlowSlider')
    };

    const outputs = {
        totalHeatingLoad: document.getElementById('totalHeatingLoad'),
        totalCoolingLoad: document.getElementById('totalCoolingLoad'),
        recommendedVolumeFlow: document.getElementById('recommendedVolumeFlow'),
        volumeFlowValue: document.getElementById('volumeFlowValue'),
        supplyTempHeating: document.getElementById('supplyTempHeating'),
        supplyTempCooling: document.getElementById('supplyTempCooling'),
        heatingHint: document.getElementById('heatingHint'),
        coolingHint: document.getElementById('coolingHint'),
        flowRateInfo: document.getElementById('flowRateInfo')
    };

    const airProperties = {
        cp: 0.34 // Vereinfachter Faktor [Wh/(m³*K)]
    };

    function calculate() {
        // --- 1. Get and validate inputs ---
        const roomArea = parseFloat(inputs.roomArea.value) || 0;
        const roomHeight = parseFloat(inputs.roomHeight.value) || 0;
        const specHeatingLoad = parseFloat(inputs.heatingLoad.value) || 0;
        const specCoolingLoad = parseFloat(inputs.coolingLoad.value) || 0;
        const roomTemp = parseFloat(inputs.roomTemp.value) || 21;

        if (roomArea <= 0 || roomHeight <= 0) {
            resetOutputs();
            return;
        }

        // --- 2. Calculate total loads and room volume ---
        const totalHeatingLoad = roomArea * specHeatingLoad;
        const totalCoolingLoad = roomArea * specCoolingLoad;
        const roomVolume = roomArea * roomHeight;

        outputs.totalHeatingLoad.textContent = `${totalHeatingLoad.toFixed(0)} W`;
        outputs.totalCoolingLoad.textContent = `${totalCoolingLoad.toFixed(0)} W`;
        
        // --- 3. Calculate recommended volume flow (based on 2x air change rate) ---
        const recommendedFlow = roomVolume * 2;
        outputs.recommendedVolumeFlow.textContent = `${recommendedFlow.toFixed(0)} m³/h`;

        // --- 4. Update slider and its value display ---
        const currentVolumeFlow = parseFloat(inputs.volumeFlowSlider.value);
        if (isFirstCalculation()) {
            // Set slider to recommended value on first valid input
            inputs.volumeFlowSlider.value = recommendedFlow.toFixed(0);
            updateSliderMax(recommendedFlow);
        }
        updateVolumeFlowDisplay();
        
        // --- 5. Calculate and display supply air temperatures ---
        calculateAndDisplayTemps();
    }
    
    function isFirstCalculation() {
        return inputs.volumeFlowSlider.value === "0" && outputs.recommendedVolumeFlow.textContent !== "0 m³/h";
    }

    function updateSliderMax(recommendedFlow) {
        // Adjust slider max range to be useful, e.g., 3x the recommended value
        const newMax = Math.max(1000, Math.ceil(recommendedFlow * 3 / 100) * 100);
        inputs.volumeFlowSlider.max = newMax;
    }

    function updateVolumeFlowDisplay() {
        const volumeFlow = parseFloat(inputs.volumeFlowSlider.value);
        outputs.volumeFlowValue.textContent = volumeFlow;

        const roomVolume = (parseFloat(inputs.roomArea.value) || 0) * (parseFloat(inputs.roomHeight.value) || 0);
        if (roomVolume > 0) {
            const airChangeRate = volumeFlow / roomVolume;
            outputs.flowRateInfo.textContent = `Das entspricht einer Luftwechselrate von ${airChangeRate.toFixed(2)} 1/h.`;
            outputs.flowRateInfo.className = 'info-box visible';
        } else {
            outputs.flowRateInfo.textContent = '';
            outputs.flowRateInfo.className = 'info-box';
        }
    }

    function calculateAndDisplayTemps() {
        const totalHeatingLoad = parseFloat(outputs.totalHeatingLoad.textContent) || 0;
        const totalCoolingLoad = parseFloat(outputs.totalCoolingLoad.textContent) || 0;
        const volumeFlow = parseFloat(inputs.volumeFlowSlider.value);
        const roomTemp = parseFloat(inputs.roomTemp.value) || 21;

        // Reset hints
        clearHints();

        if (volumeFlow === 0) {
            outputs.supplyTempHeating.textContent = '-- °C';
            outputs.supplyTempCooling.textContent = '-- °C';
            return;
        }

        // --- HEATING ---
        if (totalHeatingLoad > 0) {
            const deltaT_heating = totalHeatingLoad / (volumeFlow * airProperties.cp);
            const tempHeating = roomTemp + deltaT_heating;
            outputs.supplyTempHeating.textContent = `${tempHeating.toFixed(1)} °C`;
            // Add comfort hints
            if (deltaT_heating > 20) {
                showHint(outputs.heatingHint, 'KRITISCH: Sehr hohe Übertemperatur. Gefahr von starker Luftschichtung unter der Decke.', 'critical');
            } else if (deltaT_heating > 15) {
                 showHint(outputs.heatingHint, 'HINWEIS: Hohe Übertemperatur. Komfort kann beeinträchtigt sein.', 'warning');
            }
        } else {
            outputs.supplyTempHeating.textContent = '-- °C';
        }

        // --- COOLING ---
        if (totalCoolingLoad > 0) {
            const deltaT_cooling = totalCoolingLoad / (volumeFlow * airProperties.cp);
            const tempCooling = roomTemp - deltaT_cooling;
            outputs.supplyTempCooling.textContent = `${tempCooling.toFixed(1)} °C`;
            // Add comfort hints
            if (deltaT_cooling > 10) {
                showHint(outputs.coolingHint, 'KRITISCH: Sehr hohe Spreizung. Hohe Zugluftgefahr.', 'critical');
            } else if (deltaT_cooling > 8) {
                showHint(outputs.coolingHint, 'HINWEIS: Spreizung > 8K. Zugluftgefahr beachten.', 'warning');
            }
        } else {
            outputs.supplyTempCooling.textContent = '-- °C';
        }
    }
    
    function showHint(element, message, type) {
        element.textContent = message;
        element.className = `info-box visible ${type}`;
    }

    function clearHints() {
        outputs.heatingHint.className = 'info-box';
        outputs.coolingHint.className = 'info-box';
    }

    function resetOutputs() {
        outputs.totalHeatingLoad.textContent = '0 W';
        outputs.totalCoolingLoad.textContent = '0 W';
        outputs.recommendedVolumeFlow.textContent = '0 m³/h';
        inputs.volumeFlowSlider.value = 0;
        outputs.volumeFlowValue.textContent = '0';
        outputs.supplyTempHeating.textContent = '-- °C';
        outputs.supplyTempCooling.textContent = '-- °C';
        outputs.flowRateInfo.className = 'info-box';
        clearHints();
    }

    // --- Event Listeners ---
    Object.values(inputs).forEach(input => {
        input.addEventListener('input', calculate);
    });
    
    inputs.volumeFlowSlider.addEventListener('input', () => {
        updateVolumeFlowDisplay();
        calculateAndDisplayTemps();
    });

    // Initial calculation on page load
    calculate();
});
