(function () {
  'use strict';

  /**
   * Gets the URL of the current page.
   * @returns {URL} The URL of the current page.
   */
  function hsfw_getPageUrl(window, document) {
    if (window.parent !== window) {
      return new URL(document.referrer);
    } else {
      return new URL(window.location.href);
    }
  }

  /**
   * Formats the URL of the current page.
   * @param {URL} pageUrl - The URL of the current page.
   * @returns {string} The formatted URL.
   */
  function hsfw_formatUrl(pageUrl) {
    var pageProtocol = pageUrl.protocol;
    var pageHostname = pageUrl.hostname;
    var pagePathname = pageUrl.pathname;
    var formattedUrl = pageProtocol + "//" + pageHostname;
    if (pagePathname !== "/") {
      formattedUrl += pagePathname;
    }
    return formattedUrl;
  }

  /**
   * Creates a container element for the form widget.
   * @returns {HTMLElement} The container element.
   */
  function hsfw_createContainer(document) {
    var container = document.createElement("div");
    container.id = "hopesync_formwidget_container";
    return container;
  }

  function getUtmKeys(utmVarName, hsfw_formId) {
    return `${utmVarName}-${hsfw_formId}`;
  }

  var DEFAULT_EXPIRED_UTM_VALUE_TIMEOUT = 1000 * 60 * 3;

  function expireUtmValueLocalStorage(utmVarName, hsfw_formId) {
    setTimeout(() => {
      localStorage.removeItem(getUtmKeys(utmVarName, hsfw_formId));
    }, DEFAULT_EXPIRED_UTM_VALUE_TIMEOUT);
  }

  /**
   * Gets the query parameters from the referring page.
   * @returns {string} The query parameters as a comma-separated string.
   */
  function hsfw_getReferringPageVariables(window, localStorage, hsfw_formId) {
    const searchParams = new URLSearchParams(window.location.search);
    let params = "";
    let utmKeys = [
      "utm_source",
      "utmSource",
      "utm_medium",
      "utmMedium",
      "utm_campaign",
      "utmCampaign",
      "utm_term",
      "utmTerm",
      "utm_content",
      "utmContent",
    ];

    for (let [key, value] of searchParams.entries()) {
      params += key + "=" + value + ",";
      if (utmKeys.includes(key)) {
        localStorage.setItem(getUtmKeys(key, hsfw_formId), value);
        expireUtmValueLocalStorage(key, hsfw_formId);
      }
    }
    // find missing utm params in the url and add them to the params string
    let missingUtmParams = utmKeys.filter((key) => !searchParams.has(key));

    // load utm params from local storage for utm values that are not in the url
    for (let key of missingUtmParams) {
      if (localStorage.getItem(getUtmKeys(key, hsfw_formId))) {
        params += key + "=" + localStorage.getItem(getUtmKeys(key, hsfw_formId)) + ",";
        expireUtmValueLocalStorage(key, hsfw_formId);
      }
    }
    return params;
  }

  /**
   * Checks if the device is a mobile device.
   * @returns {boolean} True if the device is a mobile device, false otherwise.
   */
  function hsfw_isMobileDevice(navigator) {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  /**
   * Gets client information for the form widget.
   * @returns {string} The client information as a JSON string.
   */
  function hsfw_getClientInfo(window, document, localStorage, hsfw_formId, navigator) {
    return encodeURIComponent(
      JSON.stringify({
        referringSiteURL: window.location.href,
        referringPageName: window.document.title,
        previousPage: document.referrer,
        referringPageVariables: hsfw_getReferringPageVariables(window, localStorage, hsfw_formId),
        deviceScreenSizeSmallerDimension: Math.min(
          window.screen.width,
          window.screen.height
        ),
        deviceScreenSizeLargerDimension: Math.max(
          window.screen.width,
          window.screen.height
        ),
        deviceOS: navigator.platform,
        deviceBrowser: navigator.userAgent,
        deviceBrowserVersion: navigator.appVersion,
        isMobile: hsfw_isMobileDevice(navigator),
        cookiesAllowed: navigator.cookieEnabled,
      })
    );
  }

  /**
   * Sets the style for the container element.
   * @param {HTMLElement} container - The container element.
   */
  function hsfw_setContainerStyle(container) {
    // set container styles to expand to full width and height of the parent element
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.zIndex = "10000";
    container.style.backgroundColor = "transparent";
    container.style.overflow = "hidden";
    container.style.display = "block";
    container.style.margin = "0";
    container.style.padding = "0";
    container.style.border = "none";
  }

  /**
   * Gets the domain of the current page.
   * @returns {string} The domain of the current page.
   */
  function hsfw_getPageDomain(window) {
    if (window.parent !== window) {
      return window.parent.location.hostname;
    } else {
      return window.location.hostname;
    }
  }

  /**
   * Gets the source URL for the iframe.
   * @returns {string} The source URL for the iframe.
   */
  function hsfw_getSrc(window, hsfw_prod) {
    var clientDomain = hsfw_getPageDomain(window);

    var qaDomains = [
      "hsformwidget-test.azurewebsites.net",
      "hopesync2.wpcomstaging.com",
      "hopesync.wpcomstaging.com",
    ];

    var devDomains = ["hsformwidget-dev.azurewebsites.net"];

    if (hsfw_prod) {
      return "https://hsformwidget.azurewebsites.net";
    }

    if (qaDomains.includes(clientDomain))
      return "https://hsformwidget-test.azurewebsites.net";

    if (devDomains.includes(clientDomain))
      return "https://hsformwidget-dev.azurewebsites.net";

    return "https://hsformwidget.azurewebsites.net";
  }

  /**
   * Creates an iframe element for the form widget.
   * @param {string} formId - The form ID.
   * @param {string} formattedUrl - The formatted URL of the current page.
   * @param {string} clientInfo - The client information.
   * @returns {HTMLIFrameElement} The iframe element.
   */
  function hsfw_createIframe(window, document, formId, hsfw_prod, formattedUrl, clientInfo) {
    var iframe = document.createElement("iframe");
    var src = hsfw_getSrc(window, hsfw_prod);
    iframe.title = "hopesync_formwidget_iframe";
    iframe.src = `${src}/widget.html?formId=${formId}&domain=${formattedUrl}&clientInfo=${clientInfo}&src=${src}`;
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.style.backgroundColor = "transparent";
    return iframe;
  }

  /**
   * Sends a Google Analytics message to the parent window.
   * @param {MessageEvent} event - The message event.
   */
  function hsfw_sendGaMessage(event) {
    event.source.postMessage(
      {
        hs_gaID: event.data.hs_gaID,
        hs_gaGTMID: event.data.hs_gaGTMID,
      },
      "*"
    );
  }

  /**
   * Updates the Google Analytics iframe with the new page URL.
   * @param {MessageEvent} event - The message event.
   */
  function hsfw_updateGaIframe(window, event) {
    console.info("Updating GA iframe", event.data.hs_gaPageToOpen);
    const iframe2 = window.parent.document.getElementById(
      "hsformwidget-ga-iframe"
    );
    iframe2.setAttribute("src", event.data.hs_gaPageToOpen);
  }

  /**
   * Executes a function specified in the message event.
   * @param {MessageEvent} event - The message event.
   */
  function hsfw_executeFunction(window, event) {
    const { calledFunction, functionParams } = event.data;
    try {
      console.info("Proceding to execute: ", calledFunction);
      if (typeof window[calledFunction] === "function") {
        window[calledFunction](functionParams);
      } else if (typeof window.parent[calledFunction] === "function") {
        window.parent[calledFunction](functionParams);
      } else {
        console.warn(`Function ${calledFunction} not found`);
        return;
      }
      console.info(`Function ${calledFunction} executed successfully`);
    } catch (error) {
      console.warn(
        `An internal error occurred while executing ${calledFunction}:`,
        error
      );
    }
  }

  /**
   * Resizes the container element based on the height received from the message event.
   * @param {MessageEvent} event - The message event.
   */
  function hsfw_resizeContainer(document, event) {
    const hsfw_height = event.data.hsfw_height;
    if (hsfw_height) {
      document.getElementById("hopesync_formwidget_container").style.height =
        200 + hsfw_height + "px";
    }
  }

  /**
   * Adds a message listener to handle messages from the form widget.
   */
  function handleMessageEvent(window, document, event, gaFirstTime) {
    if ((event.data.hs_gaID || event.data.hs_gaGTMID) && gaFirstTime) {
      hsfw_sendGaMessage(event);
      gaFirstTime = false;
    }

    if (event.data.hs_gaPageToOpen) {
      hsfw_updateGaIframe(window, event);
    }

    if (event.data.calledFunction) {
      hsfw_executeFunction(window, event);
    }

    if (event.data.hsfw_height) {
      hsfw_resizeContainer(document, event);
    }
  }

  /**
   * Adds a message listener to handle messages from the form widget.
   */
  function hsfw_addMessageListener(window, document) {
    var gaFirstTime = true;
    window.addEventListener("message", (event) => {
      handleMessageEvent(window, document, event, gaFirstTime);
    });
  }

  function hsfw_factory(
    window,
    document,
    localStorage,
    navigator,
    hsfw_formId,
    hsfw_prod
  ) {
    const pageUrl = hsfw_getPageUrl(window, document);
    const formattedUrl = hsfw_formatUrl(pageUrl);
    const container = hsfw_createContainer(document);
    const clientInfo = hsfw_getClientInfo(window, document, localStorage, hsfw_formId, navigator);
    hsfw_setContainerStyle(container);
    const iframe = hsfw_createIframe(
      window,
      document,
      hsfw_formId,
      hsfw_prod,
      formattedUrl,
      clientInfo
    );
    hsfw_addMessageListener(window, document);
    container.appendChild(iframe);

    return container;
  }

  class EmbedCustomForm extends HTMLElement {
      constructor() {
          super();
      }
      
      connectedCallback() {
          var formId = this.getAttribute('formid');
          this.appendChild(hsfw_factory(document, window, formId, navigator, false));
      }
  }

  customElements.define('hs-form-widget', EmbedCustomForm);

})();
