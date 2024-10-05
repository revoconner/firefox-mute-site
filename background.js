const MUTE_ICON = "icons/mute.svg";
const UNMUTE_ICON = "icons/unmute.svg";
const MUTE_TITLE = "Mute Site";
const UNMUTE_TITLE = "Unmute Site";
const CUSTOM_MENU_ID = "mute-site";
let mutedDomains = [];

// Load muted domains from storage
const loadMutedDomains = async () => {
    try {
        const result = await browser.storage.local.get('mutedDomains');
        mutedDomains = result.mutedDomains || [];
        console.log("Loaded muted domains:", mutedDomains);
    } catch (error) {
        console.error(`Error loading muted domains: ${error}`);
    }
};

// Save muted domains to storage
const saveMutedDomains = async () => {
    try {
        await browser.storage.local.set({ mutedDomains });
        console.log("Saved muted domains:", mutedDomains);
    } catch (error) {
        console.error(`Error saving muted domains: ${error}`);
    }
};

const toggleMuteSite = async (tab) => {
    try {
        const domainName = new URL(tab.url).hostname;
        const isCurrentlyMuted = mutedDomains.includes(domainName);
        
        const tabs = await browser.tabs.query({ url: `*://*.${domainName}/*` });
        
        for (let t of tabs) {
            await browser.tabs.update(t.id, { muted: !isCurrentlyMuted });
        }

        if (!isCurrentlyMuted) {
            mutedDomains.push(domainName);
        } else {
            mutedDomains = mutedDomains.filter(d => d !== domainName);
        }

        await saveMutedDomains();
        await updateBrowserAction(tab);

        console.log(`Toggled mute for ${domainName}. New state: ${!isCurrentlyMuted}`);
        console.log("Current muted domains:", mutedDomains);
    } catch (error) {
        console.error(`Error toggling mute: ${error}`);
    }
};
const updateBrowserAction = async (tab) => {
    try {
        const domainName = new URL(tab.url).hostname;
        const isMuted = mutedDomains.includes(domainName);
        const title = isMuted ? UNMUTE_TITLE : MUTE_TITLE;
        const icon = isMuted ? MUTE_ICON : UNMUTE_ICON;

        await browser.browserAction.setTitle({ tabId: tab.id, title: title });
        await browser.browserAction.setIcon({ tabId: tab.id, path: icon });

        console.log(`Updated browser action for ${domainName}. Muted: ${isMuted}`);
    } catch (error) {
        console.error(`Error updating browser action: ${error}`);
    }
};

const createContextMenu = () => {
    browser.menus.create({
        id: CUSTOM_MENU_ID,
        title: MUTE_TITLE,
        contexts: ["tab"]
    }, () => {
        if (browser.runtime.lastError) {
            console.error("Error creating menu item:", browser.runtime.lastError);
        } else {
            console.log("Context menu created successfully");
        }
    });
};

const updateContextMenu = async (info, tab) => {
    try {
        const domainName = new URL(tab.url).hostname;
        const isMuted = mutedDomains.includes(domainName);
        const title = isMuted ? UNMUTE_TITLE : MUTE_TITLE;
        await browser.menus.update(CUSTOM_MENU_ID, { title: title });
        await browser.menus.refresh();
        console.log(`Updated context menu for ${domainName}. Muted: ${isMuted}`);
    } catch (error) {
        console.error(`Error updating context menu: ${error}`);
    }
};

const handleTabUpdated = async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        await updateBrowserAction(tab);
        const domainName = new URL(tab.url).hostname;
        if (mutedDomains.includes(domainName)) {
            await browser.tabs.update(tab.id, { muted: true });
            console.log(`Muted tab for ${domainName} due to stored preference`);
        }
    }
};

const initialize = async () => {
    await loadMutedDomains();
    
    const tabs = await browser.tabs.query({});
    for (let tab of tabs) {
        await updateBrowserAction(tab);
        const domainName = new URL(tab.url).hostname;
        if (mutedDomains.includes(domainName)) {
            await browser.tabs.update(tab.id, { muted: true });
            console.log(`Muted tab for ${domainName} during initialization`);
        }
    }

    createContextMenu();

    browser.tabs.onUpdated.addListener(handleTabUpdated);
    browser.browserAction.onClicked.addListener(toggleMuteSite);
    browser.menus.onShown.addListener(updateContextMenu);
    browser.menus.onClicked.addListener((info, tab) => {
        if (info.menuItemId === CUSTOM_MENU_ID) {
            toggleMuteSite(tab);
        }
    });

    console.log("Extension initialized successfully");
};

// Listen for changes in storage
browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.mutedDomains) {
        console.log("Muted domains updated in storage:", changes.mutedDomains.newValue);
        mutedDomains = changes.mutedDomains.newValue;
    }
});

// Start the extension
initialize();
