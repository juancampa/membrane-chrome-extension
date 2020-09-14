(async function () {
  chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
      const urls = document.querySelectorAll("a");
      for (let el of urls) {
        const match = el.href.match(request.regex);
        if (match) {
          console.log(el.href);
          el.style.border = "1px solid red";
        }
      }
      sendResponse({ links: "hello" });
    });
})();
