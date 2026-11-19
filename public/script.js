let historyRecords = [];
let exchangeRates = null;

const amountInput = document.getElementById('amount');
const categorySelect = document.getElementById('category');
const currencySelect = document.getElementById('currency');
const calcBtn = document.getElementById('calculate-btn');
const errorDiv = document.getElementById('error-message');
const resultDisplay = document.getElementById('result-display');
const historyBody = document.getElementById('history-body');

async function fetchRates() {
    try {
        const response = await  fetch('api/convert');
        if (!response.ok) throw new Error('Server error');
        const data = await response.json();
        exchangeRates = data.rates; 
    } catch (error) {
        console.error("Could not fetch exchange rates:", error);
    }
}
fetchRates();

calcBtn.addEventListener('click', async () => {
    errorDiv.textContent = "";
    const amount = parseFloat(amountInput.value);
    const category = categorySelect.value;
    const currency = currencySelect.value;

    if (isNaN(amount) || amount <= 0) {
        errorDiv.textContent = "Please enter a valid positive number for the amount.";
        return;
    }
    const taxRate = category === 'standard' ? 0.18 : 0;
    const vatDueRwf = amount * taxRate;
    
    let foreignEquivalentStr = "N/A";
    if (currency !== 'RWF' && exchangeRates) {
        const rate = exchangeRates[currency];
        if (rate) {
            const foreignAmount = vatDueRwf * rate;
            foreignEquivalentStr = `${foreignAmount.toFixed(2)} $ {currency}`;
        }
    } else if (currency === 'RWF') {
        foreignEquivalentStr = `${vatDueRwf.toFixed(2)} RWF`;
    }
    resultDisplay.innerHTML = `
        <h3>Revenue: ${amount.toLocaleString()} RWF</h3>
        <p>Category: <strong>${category.toUpperCase()}</strong></p>
        <p>VAT Rate: <strong>${taxRate * 100}%</strong></p>
        <p>VAT Due: <strong>${vatDueRwf.toLocaleString()} RWF</strong></p>
        <p>Equivalent in ${currency}: <strong>${foreignEquivalentStr}</strong></p>
    `;
    const record ={
        date: new Date().toDateString(),
        category: category,
        revenue: amount,
        vat: vatDueRwf,
        foreign: foreignEquivalentStr,
    };
    historyRecords.unshift(record);
    renderHistory();
});

function renderHistory() {
    historyBody.innerHTML = "";
    const filter = document.getElementById('filter-category').value;
    const search = document.getElementById('search-input').value.toLowerCase();
    const filteredRecords = historyRecords.filter(record => {
        const matchesCategory = filter === 'all' || record.category === filter;
        const matchesSearch = record.date.toLowerCase().includes(search) || record.revenue.toString().includes(search);
        return matchesCategory && matchesSearch;
    });

    filteredRecords.forEach(record => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${record.date}</td>
            <td>${record.category}</td>
            <td>${record.revenue.toLocaleString()} RWF</td>
            <td>${record.vat.toLocaleString()} RWF</td>
            <td>${record.foreign}</td>
        `;
    });
}

document.getElementById('filter-category').addEventListener('change', renderHistory);
document.getElementById('search-input').addEventListener('input', renderHistory);



