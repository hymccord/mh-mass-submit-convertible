// ==UserScript==
// @name         MouseHunt - Mass Convertible Submit
// @version      1.0.0
// @description  Add button to open/submit many convertibles one-by-one.
// @license      MIT
// @author       Xellis
// @namespace    https://github.com/hymccord
// @match        https://www.mousehuntgame.com/*
// @grant        none
// @icon         🦊
// @run-at       document-end
// ==/UserScript==

/* global $, hg, eventRegistry */
'use strict';

function queueReloadAfterDialogClose(itemType) {
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

function submitOneByOne(element) {
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

    if (quantityToOpen > 5) {
        quantityToOpen = 5
    }
    target.addClass('busy');

    let aggregatedItemData = [];
    let convertibleBaseData = null;
    let quantityLeftToOpen = quantityToOpen;

    var openItem = function() {
        hg.utils.UserInventory.useConvertible(itemType, 1, completionCallback, errorCallback);
    }

    var completionCallback = function (data) {
        quantityLeftToOpen -= 1;

        if (!data.convertible_open) {
            return;
        }

        // need the original responsed data to render template
        if (!convertibleBaseData) {
            convertibleBaseData = data.convertible_open;
        }

        // aggregate items
        aggregatedItemData.push(...data.convertible_open.items);

        if (quantityLeftToOpen > 0) {
            openItem();
        } else if (quantityLeftToOpen == 0) {
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

    openItem();
}

/**
* Return a node with links after grabbing the item ID and name from the page.
*
* @param {Object} args       Arguments to use for the links.
* @param {string} args.id    CSS selector for the item ID.
* @param {string} args.name  CSS selector for the item name.
* @param {string} args.class CSS class to add to the node.
*
* @return {false|string} False if no item ID or name found, otherwise HTML for links.
*/
const getMassSubmitNode = (args) => {
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
    submitButton.onclick = 'return false';

    $(submitButton).click((e) => submitOneByOne(e.currentTarget));
    //submitButton.addEventListener('click', () => testFunction(itemInfo), false);

    const text = document.createElement('span');
    text.innerText = 'Submit 1-by-1';

    submitButton.appendChild(text);

    return submitButton;
};
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
const appendText = (args) => {
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