// ==UserScript==
// @name         MouseHunt - Mass Convertible Submit
// @version      1.0.0
// @description  Add button to open many convertibles one-by-one so MHCT can record singles.
// @license      MIT
// @author       Xellis
// @namespace    https://github.com/hymccord
// @match        https://www.mousehuntgame.com/*
// @grant        none
// @icon         https://www.mousehuntgame.com/images/mice/square/6b9bd6acb4a07d560f61e5678e4ff3b5.jpg
// @run-at       document-end
// ==/UserScript==

/* global $, hg, eventRegistry */
'use strict';

let progressNode = null;

function useConvertibleOneByOne (element) {
    var target = $(element);
    if (target.hasClass('busy')) {
        return false;
    }

    const container = target.parents('.itemViewContainer');
    var quantityToOpen = +$('.itemView-action-convert-quantity', container).val();
    const itemType = container.data('itemType');
    if (isNaN(quantityToOpen) || quantityToOpen < 1) {
        return;
    }

    // debug limit
    //if (quantityToOpen > 5) {
    //    quantityToOpen = 5
    //}

    target.addClass('busy');
    addProgressText();
    setProgressText(0, quantityToOpen);

    let aggregatedItemData = [];
    let convertibleBaseData = null;
    let quantityOpened = 0;

    var openItem = function() {
        hg.utils.UserInventory.useConvertible(itemType, 1, completionCallback, errorCallback);
    }

    var completionCallback = function (data) {
        quantityOpened += 1;
        setProgressText(quantityOpened, quantityToOpen);

        if (!data.convertible_open) {
            return;
        }

        // need the original responsed data to render template
        if (!convertibleBaseData) {
            convertibleBaseData = data.convertible_open;
        }

        // aggregate items
        aggregatedItemData.push(...data.convertible_open.items);

        if (quantityOpened < quantityToOpen) {
            openItem();
        }

        if (quantityOpened == quantityToOpen) {
            removeProgressText();
            showAggregatedData();
        }
    }

    var errorCallback = function () {
        console.error("Error occurred during 'Submit 1-by-1'");
        showAggregatedData();
    }

    var showAggregatedData = function () {
        convertibleBaseData.items = aggregatedItemData;
        const convertibleDialog = new hg.views.ConvertibleOpenView(convertibleBaseData);
        convertibleDialog.show();
        queueReloadAfterDialogClose(itemType);
    }

    const queueReloadAfterDialogClose = function (itemType) {
        eventRegistry.addEventListener('js_dialog_hide', function () {
            setTimeout(function () {
                hg.utils.UserInventory.getItem(itemType, function (item) {
                    if ((item && item.quantity > 0) || hg.utils.PageUtil.getCurrentPage() == 'Item') {
                        hg.views.ItemView.show(item.type);
                    }
                });
            }, 100);
        }, null, true);
    }

    openItem();
}

function getMassSubmitNode (args) {
    const itemInfo = document.querySelector(args.id);
    if (! itemInfo) {
        return false;
    }

    const itemID = itemInfo.getAttribute('data-item-id');
    if (! itemID ) {
        return false;
    }

    const submitButton = document.createElement('a');
    submitButton.classList.add('mousehuntActionButton');
    submitButton.classList.add('small');
    submitButton.classList.add('itemView-action-convert-actionButton');
    submitButton.href = '#';

    $(submitButton).click((e) => {
        e.preventDefault();
        useConvertibleOneByOne(e.currentTarget);
    });

    const text = document.createElement('span');
    text.innerText = 'Submit 1-by-1';

    submitButton.appendChild(text);

    return submitButton;
};

function getProgressNode () {
    const newText = document.createElement('span');
    newText.id = 'mass-submit-convertible-progress';
    newText.style.padding = '5px 10px';
    newText.innerText = 'Progress: 0 / 0';
    return newText;
}

/**
* Append text to a node, either before or after another node.
*
* @param {Object} args         Arguments to use for the text.
* @param {string} args.parent  CSS selector for the parent node.
* @param {string} args.child   CSS selector for the child node.
* @param {string} args.content Text to append.
*
* @return {Node} The node that was appended to.
*/
function appendText (args) {
    const append = document.querySelector(args.parent);
    if (! append) {
        return false;
    }

    if (args.child) {
        const child = document.querySelector(args.child);
        if (child && args.content) {
            return append.insertBefore(args.content, child);
        }
    } else {
        return append.appendChild(args.content);
    }

    return false;
};

function addItemButton() {
    appendText({
        parent: '.itemView-action-convertForm',
        content: getMassSubmitNode({
            id: '.itemViewContainer'
        })
    });
}

function addProgressText() {
    if (progressNode != null) {
        return;
    }
    progressNode = getProgressNode();
    appendText({
        parent: '.itemView-action-convertForm',
        content: progressNode
    });
}

function setProgressText(current, max) {
    if (progressNode == null) {
        return;
    }

    $(progressNode).text(`Progress: ${current} / ${max}`);
}

function removeProgressText() {
    if (progressNode == null) {
        return
    }

    $(progressNode).remove();
    progressNode = null;
}

$(document).ajaxSuccess((e, xhr, options) => {
    const url = options.url;
    if (url.indexOf('managers/ajax/users/userInventory.php') !== -1) {
        addItemButton();
    }
});

if (window.location.href.indexOf('item.php') !== -1 ||
    window.location.href.indexOf('/i.php') !== -1 ) {
    addItemButton();
}