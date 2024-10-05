document.addEventListener('DOMContentLoaded', async () => {
    const mutedSitesList = document.getElementById('muted-sites-list');
    
    const createSiteElement = (domain) => {
        const siteElement = document.createElement('div');
        siteElement.className = 'muted-site';
        
        const spanElement = document.createElement('span');
        spanElement.textContent = domain;
        siteElement.appendChild(spanElement);
        
        const buttonElement = document.createElement('button');
        buttonElement.textContent = 'Unmute';
        buttonElement.setAttribute('data-domain', domain);
        siteElement.appendChild(buttonElement);
        
        return siteElement;
    };

    const updateList = async () => {
        const { mutedDomains } = await browser.storage.local.get('mutedDomains');
        console.log("Muted domains from storage:", mutedDomains);
        
        while (mutedSitesList.firstChild) {
            mutedSitesList.removeChild(mutedSitesList.firstChild);
        }
        
        if (mutedDomains && mutedDomains.length > 0) {
            mutedDomains.forEach(domain => {
                const siteElement = createSiteElement(domain);
                mutedSitesList.appendChild(siteElement);
            });
        } else {
            const noSitesElement = document.createElement('p');
            noSitesElement.textContent = 'No muted websites';
            mutedSitesList.appendChild(noSitesElement);
        }
    };

    mutedSitesList.addEventListener('click', async (event) => {
        if (event.target.tagName === 'BUTTON') {
            const domain = event.target.getAttribute('data-domain');
            let { mutedDomains } = await browser.storage.local.get('mutedDomains');
            mutedDomains = mutedDomains.filter(d => d !== domain);
            await browser.storage.local.set({ mutedDomains });
            
            const tabs = await browser.tabs.query({ url: `*://*.${domain}/*` });
            for (let tab of tabs) {
                await browser.tabs.update(tab.id, { muted: false });
            }
            
            updateList();
        }
    });

    browser.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.mutedDomains) {
            console.log("Storage changed. New muted domains:", changes.mutedDomains.newValue);
            updateList();
        }
    });

    updateList();
});
