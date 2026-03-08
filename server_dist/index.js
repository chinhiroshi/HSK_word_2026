// server/index.ts
import express from "express";

// server/routes.ts
import { createServer } from "node:http";
async function registerRoutes(app2) {
  const httpServer = createServer(app2);
  return httpServer;
}

// server/index.ts
import * as fs from "fs";
import * as path from "path";

// server/templates.ts
var landingPageHtml = `<!doctype html>
<html>
  <head>
    <title>APP_NAME_PLACEHOLDER</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      * { box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 32px 20px; text-align: center; background: #fff; color: #222; line-height: 1.5; min-height: 100vh; }
      .wrapper { max-width: 480px; margin: 0 auto; }
      h1 { font-size: 26px; font-weight: 600; margin: 0; color: #111; }
      .subtitle { font-size: 15px; color: #666; margin-top: 8px; margin-bottom: 32px; }
      .loading { display: none; margin: 60px 0; }
      .spinner { border: 2px solid #ddd; border-top-color: #333; border-radius: 50%; width: 32px; height: 32px; animation: spin 0.8s linear infinite; margin: 20px auto; }
      @keyframes spin { to { transform: rotate(360deg); } }
      .loading-text { font-size: 16px; color: #444; }
      .content { display: block; }
      .steps-container { display: flex; flex-direction: column; gap: 20px; }
      .step { padding: 24px; border: 1px solid #ddd; border-radius: 12px; text-align: center; background: #fafafa; }
      .step-header { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 12px; }
      .step-number { width: 28px; height: 28px; border: 1px solid #999; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; flex-shrink: 0; color: #555; }
      .step-title { font-size: 18px; font-weight: 600; margin: 0; color: #222; }
      .step-description { font-size: 14px; margin-bottom: 16px; color: #666; }
      .store-buttons { display: flex; flex-direction: column; gap: 6px; justify-content: center; flex-wrap: wrap; }
      .store-button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; font-size: 14px; font-weight: 500; border: 1px solid #ccc; border-radius: 8px; text-decoration: none; color: #333; background: #fff; transition: all 0.15s; }
      .store-button:hover { background: #f5f5f5; border-color: #999; }
      .store-link { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 0; font-size: 13px; font-weight: 400; text-decoration: underline; text-underline-offset: 2px; color: #666; background: none; border: none; transition: color 0.15s; }
      .store-link:hover { color: #333; }
      .store-link .store-icon { width: 14px; height: 14px; }
      .store-icon { width: 18px; height: 18px; }
      .qr-section { background: #333; color: #fff; border-color: #333; }
      .qr-section .step-number { border-color: rgba(255,255,255,0.5); color: #fff; }
      .qr-section .step-title { color: #fff; }
      .qr-section .step-description { color: rgba(255,255,255,0.7); }
      .qr-code { width: 180px; height: 180px; margin: 0 auto 16px; background: #fff; border-radius: 8px; padding: 12px; }
      .qr-code canvas { width: 100%; height: 100%; }
      .open-button { display: inline-block; padding: 12px 24px; font-size: 14px; font-weight: 500; border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; text-decoration: none; color: #333; background: #fff; transition: opacity 0.15s; }
      .open-button:hover { opacity: 0.9; }
      @media (min-width: 768px) { body { padding: 48px 32px; display: flex; align-items: center; justify-content: center; } .wrapper { max-width: 720px; } h1 { font-size: 32px; margin-bottom: 10px; } .subtitle { font-size: 16px; margin-bottom: 40px; } .steps-container { flex-direction: row; gap: 20px; align-items: stretch; } .step { flex: 1; display: flex; flex-direction: column; padding: 28px; } .step-description { flex-grow: 1; } .store-buttons { flex-direction: column; gap: 10px; } .qr-code { width: 200px; height: 200px; } }
      @media (min-width: 1024px) { .wrapper { max-width: 800px; } h1 { font-size: 36px; } .steps-container { gap: 28px; } .step { padding: 32px; } }
      @media (prefers-color-scheme: dark) { body { background: #0d0d0d; color: #e0e0e0; } h1 { color: #f5f5f5; } .subtitle { color: #999; } .spinner { border-color: #444; border-top-color: #ccc; } .loading-text { color: #aaa; } .step { border-color: #333; background: #1a1a1a; } .step-number { border-color: #666; color: #bbb; } .step-title { color: #f0f0f0; } .step-description { color: #888; } .store-button { border-color: #444; color: #e0e0e0; background: #222; } .store-button:hover { background: #2a2a2a; border-color: #666; } .store-link { color: #888; } .store-link:hover { color: #ccc; } .qr-section { background: #111; border-color: #333; } .qr-section .step-number { border-color: rgba(255,255,255,0.4); } .qr-section .step-description { color: rgba(255,255,255,0.6); } .open-button { background: #f0f0f0; color: #111; } .open-button:hover { background: #e0e0e0; } }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="loading" id="loading">
        <div class="spinner"></div>
        <div class="loading-text">Opening in Expo Go...</div>
      </div>
      <div class="content" id="content">
        <h1>APP_NAME_PLACEHOLDER</h1>
        <p class="subtitle">Preview this app on your phone</p>
        <div class="steps-container">
          <div class="step">
            <div class="step-header">
              <div class="step-number">1</div>
              <h2 class="step-title">Download Expo Go</h2>
            </div>
            <p class="step-description">Expo Go is a free app to test mobile apps</p>
            <div class="store-buttons" id="store-buttons">
              <a id="app-store-btn" href="https://apps.apple.com/app/id982107779" class="store-button" target="_blank">
                <svg class="store-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                App Store
              </a>
              <a id="play-store-btn" href="https://play.google.com/store/apps/details?id=host.exp.exponent" class="store-button" target="_blank">
                <svg class="store-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/></svg>
                Google Play
              </a>
            </div>
          </div>
          <div class="step qr-section">
            <div class="step-header">
              <div class="step-number">2</div>
              <h2 class="step-title">Scan QR Code</h2>
            </div>
            <p class="step-description">Use your phone's camera or Expo Go</p>
            <div class="qr-code" id="qr-code"></div>
            <a href="exps://EXPS_URL_PLACEHOLDER" class="open-button">Open in Expo Go</a>
          </div>
        </div>
      </div>
    </div>
    <script src="https://unpkg.com/qr-code-styling@1.6.0/lib/qr-code-styling.js"></script>
    <script>
      (function () {
        var ua = navigator.userAgent;
        var loadingEl = document.getElementById("loading");
        var contentEl = document.getElementById("content");
        var isAndroid = /Android/i.test(ua);
        var isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
        var deepLink = "exps://EXPS_URL_PLACEHOLDER";
        var appStoreBtn = document.getElementById("app-store-btn");
        var playStoreBtn = document.getElementById("play-store-btn");
        var storeButtonsContainer = document.getElementById("store-buttons");
        if (isIOS) { playStoreBtn.className = "store-link"; storeButtonsContainer.appendChild(playStoreBtn); }
        else if (isAndroid) { appStoreBtn.className = "store-link"; storeButtonsContainer.insertBefore(playStoreBtn, appStoreBtn); }
        var qrCode = new QRCodeStyling({ width: 400, height: 400, data: deepLink, image: "assets/images/icon.png", dotsOptions: { color: "#333333", type: "rounded" }, backgroundOptions: { color: "#ffffff" }, imageOptions: { crossOrigin: "anonymous", margin: 6, imageSize: 0.35 }, cornersSquareOptions: { type: "extra-rounded" }, cornersDotOptions: { type: "dot" }, qrOptions: { errorCorrectionLevel: "H" } });
        qrCode.append(document.getElementById("qr-code"));
        if (isAndroid || isIOS) { loadingEl.style.display = "block"; contentEl.style.display = "none"; window.location.href = deepLink; setTimeout(function () { loadingEl.style.display = "none"; contentEl.style.display = "block"; }, 500); }
      })();
    </script>
  </body>
</html>`;
var privacyPolicyHtml = `<!doctype html>
<html lang="ja">
  <head>
    <title>HSK\u53D7\u9A13\u8005\u304C\u4F5C\u3063\u305F\u5358\u8A9E\u5E33 - \u30D7\u30E9\u30A4\u30D0\u30B7\u30FC\u30DD\u30EA\u30B7\u30FC</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif; background: #FAFAF9; color: #222; line-height: 1.7; min-height: 100vh; }
      .hero { background: linear-gradient(135deg, #5B8C85 0%, #4a7a73 100%); color: #fff; padding: 48px 20px 40px; text-align: center; }
      .hero h1 { font-size: 24px; font-weight: 700; margin-bottom: 6px; }
      .hero .tagline { font-size: 14px; opacity: 0.85; }
      .container { max-width: 640px; margin: 0 auto; padding: 32px 20px 60px; }
      section { margin-bottom: 32px; }
      section h2 { font-size: 20px; font-weight: 700; color: #111; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #5B8C85; }
      section h3 { font-size: 15px; font-weight: 600; color: #333; margin: 16px 0 6px; }
      section p { font-size: 14px; color: #555; margin-bottom: 12px; }
      section ul { padding-left: 20px; margin-bottom: 12px; }
      section li { font-size: 14px; color: #555; margin-bottom: 4px; }
      a { color: #5B8C85; }
      .update-date { font-size: 13px; color: #888; margin-bottom: 24px; }
      footer { text-align: center; padding: 24px 20px; border-top: 1px solid #e8e8e8; font-size: 12px; color: #999; }
      @media (prefers-color-scheme: dark) {
        body { background: #111; color: #e0e0e0; }
        .hero { background: linear-gradient(135deg, #3d6b65 0%, #2d5550 100%); }
        section h2 { color: #f0f0f0; border-bottom-color: #7db5ad; }
        section h3 { color: #ddd; }
        section p, section li { color: #aaa; }
        .update-date { color: #777; }
        a { color: #7db5ad; }
        footer { border-top-color: #333; color: #666; }
      }
    </style>
  </head>
  <body>
    <div class="hero">
      <h1>\u30D7\u30E9\u30A4\u30D0\u30B7\u30FC\u30DD\u30EA\u30B7\u30FC</h1>
      <p class="tagline">HSK\u53D7\u9A13\u8005\u304C\u4F5C\u3063\u305F\u5358\u8A9E\u5E33</p>
    </div>
    <div class="container">
      <p class="update-date">\u6700\u7D42\u66F4\u65B0\u65E5: 2026\u5E743\u67087\u65E5</p>
      <section>
        <h2>\u306F\u3058\u3081\u306B</h2>
        <p>\u300CHSK\u53D7\u9A13\u8005\u304C\u4F5C\u3063\u305F\u5358\u8A9E\u5E33\u300D\uFF08\u4EE5\u4E0B\u300C\u672C\u30A2\u30D7\u30EA\u300D\uFF09\u306F\u3001\u30E6\u30FC\u30B6\u30FC\u306E\u30D7\u30E9\u30A4\u30D0\u30B7\u30FC\u3092\u5C0A\u91CD\u3057\u3001\u500B\u4EBA\u60C5\u5831\u306E\u4FDD\u8B77\u306B\u52AA\u3081\u3066\u3044\u307E\u3059\u3002\u672C\u30D7\u30E9\u30A4\u30D0\u30B7\u30FC\u30DD\u30EA\u30B7\u30FC\u306F\u3001\u672C\u30A2\u30D7\u30EA\u304C\u3069\u306E\u3088\u3046\u306A\u60C5\u5831\u3092\u53CE\u96C6\u3057\u3001\u3069\u306E\u3088\u3046\u306B\u5229\u7528\u3059\u308B\u304B\u3092\u8AAC\u660E\u3057\u307E\u3059\u3002</p>
      </section>
      <section>
        <h2>\u53CE\u96C6\u3059\u308B\u60C5\u5831</h2>
        <h3>\u30ED\u30FC\u30AB\u30EB\u30C7\u30FC\u30BF</h3>
        <p>\u672C\u30A2\u30D7\u30EA\u306F\u3001\u5B66\u7FD2\u306E\u9032\u6357\u72B6\u6CC1\uFF08\u6697\u8A18\u6E08\u307F\u30FB\u672A\u6697\u8A18\u306E\u5358\u8A9E\u3001\u5B66\u7FD2\u56DE\u6570\u306A\u3069\uFF09\u3092\u304A\u4F7F\u3044\u306E\u30C7\u30D0\u30A4\u30B9\u5185\u306B\u306E\u307F\u4FDD\u5B58\u3057\u307E\u3059\u3002\u3053\u308C\u3089\u306E\u30C7\u30FC\u30BF\u306F\u5916\u90E8\u30B5\u30FC\u30D0\u30FC\u306B\u9001\u4FE1\u3055\u308C\u308B\u3053\u3068\u306F\u3042\u308A\u307E\u305B\u3093\u3002</p>
        <h3>\u30B5\u30D6\u30B9\u30AF\u30EA\u30D7\u30B7\u30E7\u30F3\u60C5\u5831</h3>
        <p>\u672C\u30A2\u30D7\u30EA\u3067\u306F\u30A2\u30D7\u30EA\u5185\u8AB2\u91D1\uFF08\u30B5\u30D6\u30B9\u30AF\u30EA\u30D7\u30B7\u30E7\u30F3\uFF09\u3092\u63D0\u4F9B\u3057\u3066\u3044\u307E\u3059\u3002\u8AB2\u91D1\u51E6\u7406\u306FApple App Store / Google Play Store\u304A\u3088\u3073 RevenueCat \u3092\u901A\u3058\u3066\u884C\u308F\u308C\u307E\u3059\u3002\u8CFC\u5165\u306B\u95A2\u3059\u308B\u60C5\u5831\uFF08\u8CFC\u5165\u5C65\u6B74\u3001\u30B5\u30D6\u30B9\u30AF\u30EA\u30D7\u30B7\u30E7\u30F3\u30B9\u30C6\u30FC\u30BF\u30B9\u306A\u3069\uFF09\u306F\u3053\u308C\u3089\u306E\u30D7\u30E9\u30C3\u30C8\u30D5\u30A9\u30FC\u30E0\u306B\u3088\u3063\u3066\u7BA1\u7406\u3055\u308C\u307E\u3059\u3002</p>
      </section>
      <section>
        <h2>\u7B2C\u4E09\u8005\u30B5\u30FC\u30D3\u30B9</h2>
        <p>\u672C\u30A2\u30D7\u30EA\u306F\u4EE5\u4E0B\u306E\u7B2C\u4E09\u8005\u30B5\u30FC\u30D3\u30B9\u3092\u4F7F\u7528\u3057\u3066\u3044\u307E\u3059\uFF1A</p>
        <ul>
          <li><strong>RevenueCat</strong>: \u30B5\u30D6\u30B9\u30AF\u30EA\u30D7\u30B7\u30E7\u30F3\u306E\u7BA1\u7406\u306B\u4F7F\u7528\u3002RevenueCat\u306E\u30D7\u30E9\u30A4\u30D0\u30B7\u30FC\u30DD\u30EA\u30B7\u30FC\u306F <a href="https://www.revenuecat.com/privacy" target="_blank" rel="noopener noreferrer">\u3053\u3061\u3089</a> \u3092\u3054\u89A7\u304F\u3060\u3055\u3044\u3002</li>
          <li><strong>Apple App Store / Google Play Store</strong>: \u30A2\u30D7\u30EA\u306E\u914D\u4FE1\u304A\u3088\u3073\u8AB2\u91D1\u51E6\u7406\u306B\u4F7F\u7528\u3002</li>
        </ul>
      </section>
      <section>
        <h2>\u30C7\u30FC\u30BF\u306E\u5171\u6709</h2>
        <p>\u672C\u30A2\u30D7\u30EA\u306F\u3001\u4E0A\u8A18\u306E\u7B2C\u4E09\u8005\u30B5\u30FC\u30D3\u30B9\u3092\u9664\u304D\u3001\u30E6\u30FC\u30B6\u30FC\u306E\u30C7\u30FC\u30BF\u3092\u7B2C\u4E09\u8005\u3068\u5171\u6709\u3059\u308B\u3053\u3068\u306F\u3042\u308A\u307E\u305B\u3093\u3002</p>
      </section>
      <section>
        <h2>\u5206\u6790\u30C4\u30FC\u30EB\u30FB\u5E83\u544A</h2>
        <p>\u672C\u30A2\u30D7\u30EA\u306F\u3001\u5206\u6790\u30C4\u30FC\u30EB\u304A\u3088\u3073\u5E83\u544A\u3092\u4F7F\u7528\u3057\u3066\u3044\u307E\u305B\u3093\u3002</p>
      </section>
      <section>
        <h2>\u5B50\u4F9B\u306E\u30D7\u30E9\u30A4\u30D0\u30B7\u30FC</h2>
        <p>\u672C\u30A2\u30D7\u30EA\u306F\u5168\u5E74\u9F62\u306E\u30E6\u30FC\u30B6\u30FC\u306B\u9069\u3057\u3066\u304A\u308A\u300113\u6B73\u672A\u6E80\u306E\u5B50\u4F9B\u304B\u3089\u610F\u56F3\u7684\u306B\u500B\u4EBA\u60C5\u5831\u3092\u53CE\u96C6\u3059\u308B\u3053\u3068\u306F\u3042\u308A\u307E\u305B\u3093\u3002</p>
      </section>
      <section>
        <h2>\u30C7\u30FC\u30BF\u306E\u4FDD\u6301\u3068\u524A\u9664</h2>
        <p>\u5B66\u7FD2\u30C7\u30FC\u30BF\u306F\u30C7\u30D0\u30A4\u30B9\u306E\u30ED\u30FC\u30AB\u30EB\u30B9\u30C8\u30EC\u30FC\u30B8\u306B\u4FDD\u5B58\u3055\u308C\u307E\u3059\u3002\u4EE5\u4E0B\u306E\u65B9\u6CD5\u3067\u30C7\u30FC\u30BF\u3092\u524A\u9664\u3067\u304D\u307E\u3059\uFF1A</p>
        <ul>
          <li>\u30A2\u30D7\u30EA\u5185\u306E\u300C\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u300D\u753B\u9762\u304B\u3089\u3059\u3079\u3066\u306E\u5B66\u7FD2\u30C7\u30FC\u30BF\u3092\u30EA\u30BB\u30C3\u30C8</li>
          <li>\u30A2\u30D7\u30EA\u3092\u30A2\u30F3\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB\u3059\u308B\u3053\u3068\u3067\u3001\u3059\u3079\u3066\u306E\u30ED\u30FC\u30AB\u30EB\u30C7\u30FC\u30BF\u3092\u524A\u9664</li>
        </ul>
      </section>
      <section>
        <h2>\u5909\u66F4\u306B\u3064\u3044\u3066</h2>
        <p>\u672C\u30D7\u30E9\u30A4\u30D0\u30B7\u30FC\u30DD\u30EA\u30B7\u30FC\u306F\u3001\u5FC5\u8981\u306B\u5FDC\u3058\u3066\u66F4\u65B0\u3055\u308C\u308B\u3053\u3068\u304C\u3042\u308A\u307E\u3059\u3002\u91CD\u8981\u306A\u5909\u66F4\u304C\u3042\u308B\u5834\u5408\u306F\u3001\u30A2\u30D7\u30EA\u306E\u30A2\u30C3\u30D7\u30C7\u30FC\u30C8\u3092\u901A\u3058\u3066\u304A\u77E5\u3089\u305B\u3057\u307E\u3059\u3002</p>
      </section>
      <section>
        <h2>\u304A\u554F\u3044\u5408\u308F\u305B</h2>
        <p>\u672C\u30D7\u30E9\u30A4\u30D0\u30B7\u30FC\u30DD\u30EA\u30B7\u30FC\u306B\u95A2\u3059\u308B\u3054\u8CEA\u554F\u304C\u3054\u3056\u3044\u307E\u3057\u305F\u3089\u3001<a href="mailto:hiroshi.chin@gmail.com">hiroshi.chin@gmail.com</a> \u307E\u3067\u304A\u554F\u3044\u5408\u308F\u305B\u304F\u3060\u3055\u3044\u3002</p>
      </section>
    </div>
    <footer>&copy; 2026 HSK\u53D7\u9A13\u8005\u304C\u4F5C\u3063\u305F\u5358\u8A9E\u5E33</footer>
  </body>
</html>`;
var termsOfUseHtml = `<!doctype html>
<html lang="ja">
  <head>
    <title>HSK\u53D7\u9A13\u8005\u304C\u4F5C\u3063\u305F\u5358\u8A9E\u5E33 - \u5229\u7528\u898F\u7D04</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif; background: #FAFAF9; color: #222; line-height: 1.7; min-height: 100vh; }
      .hero { background: linear-gradient(135deg, #5B8C85 0%, #4a7a73 100%); color: #fff; padding: 48px 20px 40px; text-align: center; }
      .hero h1 { font-size: 24px; font-weight: 700; margin-bottom: 6px; }
      .hero .tagline { font-size: 14px; opacity: 0.85; }
      .container { max-width: 640px; margin: 0 auto; padding: 32px 20px 60px; }
      section { margin-bottom: 32px; }
      section h2 { font-size: 20px; font-weight: 700; color: #111; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #5B8C85; }
      section h3 { font-size: 15px; font-weight: 600; color: #333; margin: 16px 0 6px; }
      section p { font-size: 14px; color: #555; margin-bottom: 12px; }
      section ul { padding-left: 20px; margin-bottom: 12px; }
      section li { font-size: 14px; color: #555; margin-bottom: 4px; }
      a { color: #5B8C85; }
      .update-date { font-size: 13px; color: #888; margin-bottom: 24px; }
      footer { text-align: center; padding: 24px 20px; border-top: 1px solid #e8e8e8; font-size: 12px; color: #999; }
      @media (prefers-color-scheme: dark) {
        body { background: #111; color: #e0e0e0; }
        .hero { background: linear-gradient(135deg, #3d6b65 0%, #2d5550 100%); }
        section h2 { color: #f0f0f0; border-bottom-color: #7db5ad; }
        section h3 { color: #ddd; }
        section p, section li { color: #aaa; }
        .update-date { color: #777; }
        a { color: #7db5ad; }
        footer { border-top-color: #333; color: #666; }
      }
    </style>
  </head>
  <body>
    <div class="hero">
      <h1>\u5229\u7528\u898F\u7D04</h1>
      <p class="tagline">HSK\u53D7\u9A13\u8005\u304C\u4F5C\u3063\u305F\u5358\u8A9E\u5E33</p>
    </div>
    <div class="container">
      <p class="update-date">\u6700\u7D42\u66F4\u65B0\u65E5: 2026\u5E743\u67087\u65E5</p>
      <section>
        <h2>\u7B2C1\u6761\uFF08\u9069\u7528\uFF09</h2>
        <p>\u672C\u5229\u7528\u898F\u7D04\uFF08\u4EE5\u4E0B\u300C\u672C\u898F\u7D04\u300D\uFF09\u306F\u3001\u300CHSK\u53D7\u9A13\u8005\u304C\u4F5C\u3063\u305F\u5358\u8A9E\u5E33\u300D\uFF08\u4EE5\u4E0B\u300C\u672C\u30A2\u30D7\u30EA\u300D\uFF09\u306E\u5229\u7528\u306B\u95A2\u3059\u308B\u6761\u4EF6\u3092\u5B9A\u3081\u308B\u3082\u306E\u3067\u3059\u3002\u30E6\u30FC\u30B6\u30FC\u306F\u3001\u672C\u30A2\u30D7\u30EA\u3092\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u307E\u305F\u306F\u4F7F\u7528\u3059\u308B\u3053\u3068\u306B\u3088\u308A\u3001\u672C\u898F\u7D04\u306B\u540C\u610F\u3057\u305F\u3082\u306E\u3068\u307F\u306A\u3055\u308C\u307E\u3059\u3002</p>
      </section>
      <section>
        <h2>\u7B2C2\u6761\uFF08\u30B5\u30FC\u30D3\u30B9\u5185\u5BB9\uFF09</h2>
        <p>\u672C\u30A2\u30D7\u30EA\u306F\u3001HSK\uFF08\u6F22\u8A9E\u6C34\u5E73\u8003\u8A66\uFF09\u306E\u53D7\u9A13\u5BFE\u7B56\u3068\u3057\u3066\u3001\u4E2D\u56FD\u8A9E\u5358\u8A9E\u306E\u5B66\u7FD2\u652F\u63F4\u30B5\u30FC\u30D3\u30B9\u3092\u63D0\u4F9B\u3057\u307E\u3059\u3002\u4E3B\u306A\u6A5F\u80FD\u306F\u4EE5\u4E0B\u306E\u901A\u308A\u3067\u3059\uFF1A</p>
        <ul>
          <li>HSK1\u7D1A\u301C6\u7D1A\u306E\u5358\u8A9E\u306E\u95B2\u89A7\u30FB\u5B66\u7FD2</li>
          <li>\u6587\u5B57\u6697\u8A18\u30E2\u30FC\u30C9\u30FB\u97F3\u58F0\u6697\u8A18\u30E2\u30FC\u30C9\u306B\u3088\u308B\u5B66\u7FD2</li>
          <li>\u97F3\u58F0\u518D\u751F\u306B\u3088\u308B\u9023\u7D9A\u5B66\u7FD2</li>
          <li>\u5B66\u7FD2\u9032\u6357\u306E\u7BA1\u7406</li>
        </ul>
      </section>
      <section>
        <h2>\u7B2C3\u6761\uFF08\u30B5\u30D6\u30B9\u30AF\u30EA\u30D7\u30B7\u30E7\u30F3\uFF09</h2>
        <h3>\u7121\u6599\u30D7\u30E9\u30F3</h3>
        <p>HSK1\u7D1A\u306E\u5168\u5358\u8A9E\u304A\u3088\u3073HSK2\u301C6\u7D1A\u306E\u5404\u30EC\u30D9\u30EB\u6700\u521D\u306E50\u5358\u8A9E\u306F\u3001\u7121\u6599\u3067\u3054\u5229\u7528\u3044\u305F\u3060\u3051\u307E\u3059\u3002</p>
        <h3>\u30D7\u30EC\u30DF\u30A2\u30E0\u30D7\u30E9\u30F3</h3>
        <p>HSK2\u301C6\u7D1A\u306E\u5168\u5358\u8A9E\u306B\u30A2\u30AF\u30BB\u30B9\u3059\u308B\u306B\u306F\u3001\u6708\u984D\u30B5\u30D6\u30B9\u30AF\u30EA\u30D7\u30B7\u30E7\u30F3\uFF08\xA5380/\u6708\uFF09\u3078\u306E\u767B\u9332\u304C\u5FC5\u8981\u3067\u3059\u3002</p>
        <h3>\u81EA\u52D5\u66F4\u65B0\u3068\u89E3\u7D04</h3>
        <ul>
          <li>\u30B5\u30D6\u30B9\u30AF\u30EA\u30D7\u30B7\u30E7\u30F3\u306F\u3001\u73FE\u5728\u306E\u671F\u9593\u304C\u7D42\u4E86\u3059\u308B24\u6642\u9593\u524D\u307E\u3067\u306B\u30AD\u30E3\u30F3\u30BB\u30EB\u3057\u306A\u3044\u9650\u308A\u3001\u81EA\u52D5\u7684\u306B\u66F4\u65B0\u3055\u308C\u307E\u3059\u3002</li>
          <li>\u66F4\u65B0\u6642\u306B\u3001\u30B5\u30D6\u30B9\u30AF\u30EA\u30D7\u30B7\u30E7\u30F3\u6599\u91D1\u304CApple ID\u307E\u305F\u306FGoogle Play\u30A2\u30AB\u30A6\u30F3\u30C8\u306B\u8ACB\u6C42\u3055\u308C\u307E\u3059\u3002</li>
          <li>\u30B5\u30D6\u30B9\u30AF\u30EA\u30D7\u30B7\u30E7\u30F3\u306E\u7BA1\u7406\u304A\u3088\u3073\u30AD\u30E3\u30F3\u30BB\u30EB\u306F\u3001\u304A\u4F7F\u3044\u306E\u30C7\u30D0\u30A4\u30B9\u306E\u8A2D\u5B9A\u753B\u9762\u304B\u3089\u884C\u3048\u307E\u3059\u3002</li>
          <li>\u7121\u6599\u30C8\u30E9\u30A4\u30A2\u30EB\u671F\u9593\u304C\u3042\u308B\u5834\u5408\u3001\u672A\u4F7F\u7528\u5206\u306F\u30B5\u30D6\u30B9\u30AF\u30EA\u30D7\u30B7\u30E7\u30F3\u8CFC\u5165\u6642\u306B\u5931\u52B9\u3057\u307E\u3059\u3002</li>
        </ul>
      </section>
      <section>
        <h2>\u7B2C4\u6761\uFF08\u77E5\u7684\u8CA1\u7523\u6A29\uFF09</h2>
        <p>\u672C\u30A2\u30D7\u30EA\u306B\u542B\u307E\u308C\u308B\u3059\u3079\u3066\u306E\u30B3\u30F3\u30C6\u30F3\u30C4\uFF08\u30C6\u30AD\u30B9\u30C8\u3001\u97F3\u58F0\u3001\u30C7\u30B6\u30A4\u30F3\u3001\u30BD\u30D5\u30C8\u30A6\u30A7\u30A2\u306A\u3069\uFF09\u306B\u95A2\u3059\u308B\u77E5\u7684\u8CA1\u7523\u6A29\u306F\u3001\u958B\u767A\u8005\u307E\u305F\u306F\u305D\u306E\u30E9\u30A4\u30BB\u30F3\u30B5\u30FC\u306B\u5E30\u5C5E\u3057\u307E\u3059\u3002\u30E6\u30FC\u30B6\u30FC\u306F\u3001\u500B\u4EBA\u7684\u306A\u5B66\u7FD2\u76EE\u7684\u4EE5\u5916\u3067\u672C\u30A2\u30D7\u30EA\u306E\u30B3\u30F3\u30C6\u30F3\u30C4\u3092\u8907\u88FD\u3001\u914D\u5E03\u3001\u4FEE\u6B63\u3059\u308B\u3053\u3068\u306F\u3067\u304D\u307E\u305B\u3093\u3002</p>
      </section>
      <section>
        <h2>\u7B2C5\u6761\uFF08\u7981\u6B62\u4E8B\u9805\uFF09</h2>
        <p>\u30E6\u30FC\u30B6\u30FC\u306F\u3001\u4EE5\u4E0B\u306E\u884C\u70BA\u3092\u884C\u3063\u3066\u306F\u306A\u308A\u307E\u305B\u3093\uFF1A</p>
        <ul>
          <li>\u672C\u30A2\u30D7\u30EA\u306E\u9006\u30B3\u30F3\u30D1\u30A4\u30EB\u3001\u30EA\u30D0\u30FC\u30B9\u30A8\u30F3\u30B8\u30CB\u30A2\u30EA\u30F3\u30B0\u3001\u307E\u305F\u306F\u89E3\u6790</li>
          <li>\u672C\u30A2\u30D7\u30EA\u306E\u30B3\u30F3\u30C6\u30F3\u30C4\u306E\u7121\u65AD\u8EE2\u8F09\u30FB\u518D\u914D\u5E03</li>
          <li>\u672C\u30A2\u30D7\u30EA\u306E\u6B63\u5E38\u306A\u904B\u7528\u3092\u59A8\u5BB3\u3059\u308B\u884C\u70BA</li>
          <li>\u4E0D\u6B63\u306A\u65B9\u6CD5\u306B\u3088\u308B\u30B5\u30D6\u30B9\u30AF\u30EA\u30D7\u30B7\u30E7\u30F3\u306E\u53D6\u5F97</li>
        </ul>
      </section>
      <section>
        <h2>\u7B2C6\u6761\uFF08\u514D\u8CAC\u4E8B\u9805\uFF09</h2>
        <p>\u672C\u30A2\u30D7\u30EA\u306F\u300C\u73FE\u72B6\u6709\u59FF\u300D\u3067\u63D0\u4F9B\u3055\u308C\u307E\u3059\u3002\u958B\u767A\u8005\u306F\u3001\u4EE5\u4E0B\u306B\u3064\u3044\u3066\u4E00\u5207\u306E\u8CAC\u4EFB\u3092\u8CA0\u3044\u307E\u305B\u3093\uFF1A</p>
        <ul>
          <li>\u672C\u30A2\u30D7\u30EA\u306E\u5185\u5BB9\u306E\u6B63\u78BA\u6027\u3001\u5B8C\u5168\u6027\u3001\u6700\u65B0\u6027</li>
          <li>\u672C\u30A2\u30D7\u30EA\u306E\u5229\u7528\u306B\u3088\u308BHSK\u8A66\u9A13\u306E\u5408\u5426\u7D50\u679C</li>
          <li>\u672C\u30A2\u30D7\u30EA\u306E\u5229\u7528\u306B\u8D77\u56E0\u3059\u308B\u30C7\u30D0\u30A4\u30B9\u306E\u4E0D\u5177\u5408\u3084\u30C7\u30FC\u30BF\u306E\u640D\u5931</li>
          <li>\u30B5\u30FC\u30D3\u30B9\u306E\u4E2D\u65AD\u3001\u505C\u6B62\u3001\u5909\u66F4</li>
        </ul>
      </section>
      <section>
        <h2>\u7B2C7\u6761\uFF08\u898F\u7D04\u306E\u5909\u66F4\uFF09</h2>
        <p>\u958B\u767A\u8005\u306F\u3001\u5FC5\u8981\u306B\u5FDC\u3058\u3066\u672C\u898F\u7D04\u3092\u5909\u66F4\u3067\u304D\u308B\u3082\u306E\u3068\u3057\u307E\u3059\u3002\u5909\u66F4\u5F8C\u306E\u898F\u7D04\u306F\u3001\u30A2\u30D7\u30EA\u306E\u30A2\u30C3\u30D7\u30C7\u30FC\u30C8\u307E\u305F\u306F\u672C\u30DA\u30FC\u30B8\u3067\u306E\u516C\u958B\u3092\u3082\u3063\u3066\u52B9\u529B\u3092\u751F\u3058\u307E\u3059\u3002\u5909\u66F4\u5F8C\u3082\u672C\u30A2\u30D7\u30EA\u306E\u5229\u7528\u3092\u7D99\u7D9A\u3057\u305F\u5834\u5408\u3001\u5909\u66F4\u5F8C\u306E\u898F\u7D04\u306B\u540C\u610F\u3057\u305F\u3082\u306E\u3068\u307F\u306A\u3055\u308C\u307E\u3059\u3002</p>
      </section>
      <section>
        <h2>\u7B2C8\u6761\uFF08Apple\u6A19\u6E96EULA\uFF09</h2>
        <p>\u672C\u30A2\u30D7\u30EA\u306E\u3054\u5229\u7528\u306B\u306F\u3001\u672C\u898F\u7D04\u306B\u52A0\u3048\u3066\u3001Apple Inc.\u306E\u6A19\u6E96\u4F7F\u7528\u8A31\u8AFE\u5951\u7D04\uFF08EULA\uFF09\u304C\u9069\u7528\u3055\u308C\u307E\u3059\u3002\u8A73\u7D30\u306F\u4EE5\u4E0B\u306E\u30EA\u30F3\u30AF\u3092\u3054\u53C2\u7167\u304F\u3060\u3055\u3044\uFF1A</p>
        <p><a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noopener noreferrer">Apple\u6A19\u6E96\u4F7F\u7528\u8A31\u8AFE\u5951\u7D04\uFF08EULA\uFF09</a></p>
      </section>
      <section>
        <h2>\u304A\u554F\u3044\u5408\u308F\u305B</h2>
        <p>\u672C\u898F\u7D04\u306B\u95A2\u3059\u308B\u3054\u8CEA\u554F\u304C\u3054\u3056\u3044\u307E\u3057\u305F\u3089\u3001<a href="mailto:hiroshi.chin@gmail.com">hiroshi.chin@gmail.com</a> \u307E\u3067\u304A\u554F\u3044\u5408\u308F\u305B\u304F\u3060\u3055\u3044\u3002</p>
      </section>
    </div>
    <footer>&copy; 2026 HSK\u53D7\u9A13\u8005\u304C\u4F5C\u3063\u305F\u5358\u8A9E\u5E33</footer>
  </body>
</html>`;
var supportHtml = `<!doctype html>
<html lang="ja">
  <head>
    <title>HSK\u53D7\u9A13\u8005\u304C\u4F5C\u3063\u305F\u5358\u8A9E\u5E33 - \u30B5\u30DD\u30FC\u30C8</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif; background: #FAFAF9; color: #222; line-height: 1.7; min-height: 100vh; }
      .hero { background: linear-gradient(135deg, #5B8C85 0%, #4a7a73 100%); color: #fff; padding: 48px 20px 40px; text-align: center; }
      .hero-icon { width: 80px; height: 80px; border-radius: 18px; margin-bottom: 16px; }
      .hero h1 { font-size: 24px; font-weight: 700; margin-bottom: 6px; }
      .hero .tagline { font-size: 14px; opacity: 0.85; }
      nav { background: #fff; border-bottom: 1px solid #e5e5e5; padding: 0 20px; display: flex; gap: 0; justify-content: center; position: sticky; top: 0; z-index: 10; }
      nav a { display: block; padding: 12px 16px; font-size: 13px; font-weight: 500; color: #666; text-decoration: none; border-bottom: 2px solid transparent; transition: all 0.2s; }
      nav a:hover, nav a.active { color: #5B8C85; border-bottom-color: #5B8C85; }
      .container { max-width: 640px; margin: 0 auto; padding: 32px 20px 60px; }
      section { margin-bottom: 40px; }
      section h2 { font-size: 20px; font-weight: 700; color: #111; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #5B8C85; }
      section h3 { font-size: 16px; font-weight: 600; color: #333; margin: 20px 0 8px; }
      section p { font-size: 15px; color: #444; margin-bottom: 12px; }
      .features { display: grid; gap: 12px; }
      .feature-card { background: #fff; border: 1px solid #e8e8e8; border-radius: 12px; padding: 20px; }
      .feature-card .icon { font-size: 28px; margin-bottom: 8px; display: block; }
      .feature-card h3 { font-size: 16px; font-weight: 600; color: #222; margin: 0 0 6px; }
      .feature-card p { font-size: 14px; color: #666; margin: 0; }
      .faq-item { background: #fff; border: 1px solid #e8e8e8; border-radius: 10px; margin-bottom: 10px; overflow: hidden; }
      .faq-item summary { padding: 16px 20px; font-size: 15px; font-weight: 600; color: #333; cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center; }
      .faq-item summary::-webkit-details-marker { display: none; }
      .faq-item summary::after { content: "+"; font-size: 20px; color: #999; flex-shrink: 0; margin-left: 12px; transition: transform 0.2s; }
      .faq-item[open] summary::after { content: "-"; }
      .faq-item .answer { padding: 0 20px 16px; font-size: 14px; color: #555; line-height: 1.7; }
      .contact-box { background: #fff; border: 1px solid #e8e8e8; border-radius: 12px; padding: 24px; text-align: center; }
      .contact-box p { font-size: 14px; color: #666; margin-bottom: 16px; }
      .contact-email { display: inline-block; padding: 12px 28px; background: #5B8C85; color: #fff; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; transition: background 0.2s; }
      .contact-email:hover { background: #4a7a73; }
      .privacy-section h3 { font-size: 15px; font-weight: 600; color: #333; margin: 16px 0 6px; }
      .privacy-section p, .privacy-section li { font-size: 14px; color: #555; }
      .privacy-section ul { padding-left: 20px; margin-bottom: 12px; }
      .privacy-section li { margin-bottom: 4px; }
      footer { text-align: center; padding: 24px 20px; border-top: 1px solid #e8e8e8; font-size: 12px; color: #999; }
      @media (min-width: 768px) { .hero { padding: 64px 32px 56px; } .hero-icon { width: 96px; height: 96px; } .hero h1 { font-size: 30px; } .container { padding: 40px 20px 80px; } .features { grid-template-columns: 1fr 1fr; } }
      @media (prefers-color-scheme: dark) {
        body { background: #111; color: #e0e0e0; }
        .hero { background: linear-gradient(135deg, #3d6b65 0%, #2d5550 100%); }
        nav { background: #1a1a1a; border-bottom-color: #333; }
        nav a { color: #999; }
        nav a:hover, nav a.active { color: #7db5ad; border-bottom-color: #7db5ad; }
        section h2 { color: #f0f0f0; border-bottom-color: #7db5ad; }
        section h3 { color: #ddd; }
        section p { color: #bbb; }
        .feature-card { background: #1a1a1a; border-color: #333; }
        .feature-card h3 { color: #e0e0e0; }
        .feature-card p { color: #999; }
        .faq-item { background: #1a1a1a; border-color: #333; }
        .faq-item summary { color: #e0e0e0; }
        .faq-item summary::after { color: #666; }
        .faq-item .answer { color: #aaa; }
        .contact-box { background: #1a1a1a; border-color: #333; }
        .contact-box p { color: #999; }
        .contact-email { background: #5B8C85; }
        .contact-email:hover { background: #6da39b; }
        .privacy-section h3 { color: #ddd; }
        .privacy-section p, .privacy-section li { color: #aaa; }
        footer { border-top-color: #333; color: #666; }
      }
    </style>
  </head>
  <body>
    <div class="hero">
      <img src="/assets/images/app-icon.png" alt="App Icon" class="hero-icon" />
      <h1>HSK\u53D7\u9A13\u8005\u304C\u4F5C\u3063\u305F\u5358\u8A9E\u5E33</h1>
      <p class="tagline">HSK4\u7D1A\u5BFE\u5FDC - \u8074\u3044\u3066\u899A\u3048\u308B\u4E2D\u56FD\u8A9E\u5358\u8A9E\u5E33</p>
    </div>
    <nav>
      <a href="#features" class="active">\u6A5F\u80FD\u7D39\u4ECB</a>
      <a href="#faq">\u3088\u304F\u3042\u308B\u8CEA\u554F</a>
      <a href="#contact">\u304A\u554F\u3044\u5408\u308F\u305B</a>
      <a href="#privacy">\u30D7\u30E9\u30A4\u30D0\u30B7\u30FC</a>
    </nav>
    <div class="container">
      <section id="about">
        <h2>\u30A2\u30D7\u30EA\u306B\u3064\u3044\u3066</h2>
        <p>\u300CHSK\u53D7\u9A13\u8005\u304C\u4F5C\u3063\u305F\u5358\u8A9E\u5E33\u300D\u306F\u3001HSK\uFF08\u6F22\u8A9E\u6C34\u5E73\u8003\u8A66\uFF094\u7D1A\u306E\u5FC5\u9808\u5358\u8A9E\u7D04600\u8A9E\u3092\u53CE\u9332\u3057\u305F\u4E2D\u56FD\u8A9E\u8A9E\u5F59\u5B66\u7FD2\u30A2\u30D7\u30EA\u3067\u3059\u3002\u5B9F\u969B\u306EHSK\u53D7\u9A13\u7D4C\u9A13\u3092\u3082\u3068\u306B\u3001\u5408\u683C\u306B\u76F4\u7D50\u3059\u308B\u5358\u8A9E\u5E33\u3092\u4F5C\u308A\u307E\u3057\u305F\u3002</p>
        <p>\u6587\u5B57\u6697\u8A18\u3068\u97F3\u58F0\u6697\u8A18\u306E2\u3064\u306E\u30E2\u30FC\u30C9\u3067\u3001\u898B\u3066\u899A\u3048\u308B\u30FB\u8074\u3044\u3066\u899A\u3048\u308B\u306E\u4E21\u65B9\u304B\u3089\u30A2\u30D7\u30ED\u30FC\u30C1\u300250\u8A9E\u305A\u3064\u306E\u30B0\u30EB\u30FC\u30D7\u5206\u3051\u3067\u3001\u8A08\u753B\u7684\u306B\u5B66\u7FD2\u3092\u9032\u3081\u3089\u308C\u307E\u3059\u3002</p>
      </section>
      <section id="features">
        <h2>\u4E3B\u306A\u6A5F\u80FD</h2>
        <div class="features">
          <div class="feature-card"><span class="icon" aria-hidden="true">&#x1F4D6;</span><h3>\u6587\u5B57\u6697\u8A18\u30E2\u30FC\u30C9</h3><p>\u6F22\u5B57\u30FB\u30D4\u30F3\u30A4\u30F3\u30FB\u4F8B\u6587\u3092\u898B\u306A\u304C\u3089\u8996\u899A\u7684\u306B\u8A18\u61B6\u3002\u6697\u8A18\u72B6\u6CC1\u3092\u30D5\u30A3\u30EB\u30BF\u30EA\u30F3\u30B0\u3057\u3066\u52B9\u7387\u7684\u306B\u5FA9\u7FD2\u3067\u304D\u307E\u3059\u3002</p></div>
          <div class="feature-card"><span class="icon" aria-hidden="true">&#x1F3A7;</span><h3>\u97F3\u58F0\u6697\u8A18\u30E2\u30FC\u30C9</h3><p>\u4E2D\u56FD\u8A9E\u3092\u96A0\u3057\u305F\u72B6\u614B\u3067\u97F3\u58F0\u304B\u3089\u610F\u5473\u3092\u7406\u89E3\u3002\u30EA\u30B9\u30CB\u30F3\u30B0\u529B\u3068\u8A9E\u5F59\u529B\u3092\u540C\u6642\u306B\u5F37\u5316\u3057\u307E\u3059\u3002</p></div>
          <div class="feature-card"><span class="icon" aria-hidden="true">&#x1F50A;</span><h3>\u97F3\u58F0\u518D\u751F\u6A5F\u80FD</h3><p>\u4E2D\u56FD\u8A9E\u30FB\u65E5\u672C\u8A9E\u30FB\u82F1\u8A9E\u306E\u4F8B\u6587\u3092\u9023\u7D9A\u518D\u751F\u30020.5\u301C2\u500D\u901F\u307E\u3067\u8ABF\u6574\u53EF\u80FD\u3002\u901A\u52E4\u4E2D\u306E\u306A\u304C\u3089\u5B66\u7FD2\u306B\u6700\u9069\u3002</p></div>
          <div class="feature-card"><span class="icon" aria-hidden="true">&#x1F4CA;</span><h3>\u9032\u6357\u7BA1\u7406</h3><p>\u6697\u8A18\u6E08\u307F\u30FB\u6697\u8A18\u5FC5\u8981\u30FB\u672A\u6697\u8A18\u306E3\u6BB5\u968E\u3067\u9032\u6357\u3092\u53EF\u8996\u5316\u3002\u82E6\u624B\u306A\u5358\u8A9E\u3092\u91CD\u70B9\u7684\u306B\u5FA9\u7FD2\u3067\u304D\u307E\u3059\u3002</p></div>
        </div>
      </section>
      <section id="faq">
        <h2>\u3088\u304F\u3042\u308B\u8CEA\u554F</h2>
        <details class="faq-item"><summary>\u3069\u306E\u30EC\u30D9\u30EB\u306E\u5358\u8A9E\u304C\u53CE\u9332\u3055\u308C\u3066\u3044\u307E\u3059\u304B\uFF1F</summary><div class="answer">\u73FE\u5728\u306FHSK4\u7D1A\u306E\u5FC5\u9808\u5358\u8A9E\u7D04600\u8A9E\u3092\u53CE\u9332\u3057\u3066\u3044\u307E\u3059\u3002\u4ED6\u306E\u7D1A\uFF081\u301C3\u7D1A\u30015\u301C6\u7D1A\uFF09\u306E\u5358\u8A9E\u306F\u4ECA\u5F8C\u306E\u30A2\u30C3\u30D7\u30C7\u30FC\u30C8\u3067\u8FFD\u52A0\u4E88\u5B9A\u3067\u3059\u3002</div></details>
        <details class="faq-item"><summary>\u30A4\u30F3\u30BF\u30FC\u30CD\u30C3\u30C8\u63A5\u7D9A\u306F\u5FC5\u8981\u3067\u3059\u304B\uFF1F</summary><div class="answer">\u97F3\u58F0\u518D\u751F\u306B\u306F\u30C7\u30D0\u30A4\u30B9\u306E\u30C6\u30AD\u30B9\u30C8\u8AAD\u307F\u4E0A\u3052\u6A5F\u80FD\u3092\u4F7F\u7528\u3057\u3066\u3044\u308B\u305F\u3081\u3001\u57FA\u672C\u7684\u306B\u30AA\u30D5\u30E9\u30A4\u30F3\u3067\u3082\u3054\u5229\u7528\u3044\u305F\u3060\u3051\u307E\u3059\u3002\u521D\u56DE\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u5F8C\u306F\u30A4\u30F3\u30BF\u30FC\u30CD\u30C3\u30C8\u63A5\u7D9A\u306A\u3057\u3067\u5B66\u7FD2\u3067\u304D\u307E\u3059\u3002</div></details>
        <details class="faq-item"><summary>\u5B66\u7FD2\u30C7\u30FC\u30BF\u306F\u4ED6\u306E\u30C7\u30D0\u30A4\u30B9\u306B\u5F15\u304D\u7D99\u3052\u307E\u3059\u304B\uFF1F</summary><div class="answer">\u73FE\u5728\u3001\u5B66\u7FD2\u30C7\u30FC\u30BF\u306F\u304A\u4F7F\u3044\u306E\u30C7\u30D0\u30A4\u30B9\u5185\u306B\u306E\u307F\u4FDD\u5B58\u3055\u308C\u307E\u3059\u3002\u30C7\u30D0\u30A4\u30B9\u9593\u306E\u540C\u671F\u6A5F\u80FD\u306F\u4ECA\u5F8C\u306E\u30A2\u30C3\u30D7\u30C7\u30FC\u30C8\u3067\u691C\u8A0E\u3057\u3066\u3044\u307E\u3059\u3002</div></details>
        <details class="faq-item"><summary>\u5B66\u7FD2\u30C7\u30FC\u30BF\u3092\u30EA\u30BB\u30C3\u30C8\u3057\u305F\u3044\u5834\u5408\u306F\uFF1F</summary><div class="answer">\u30A2\u30D7\u30EA\u5185\u306E\u300C\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u300D\u753B\u9762\u304B\u3089\u3001\u3059\u3079\u3066\u306E\u5B66\u7FD2\u30C7\u30FC\u30BF\u3092\u30EA\u30BB\u30C3\u30C8\u3067\u304D\u307E\u3059\u3002\u30EA\u30BB\u30C3\u30C8\u3059\u308B\u3068\u6697\u8A18\u72B6\u6CC1\u304C\u3059\u3079\u3066\u521D\u671F\u5316\u3055\u308C\u307E\u3059\u306E\u3067\u3054\u6CE8\u610F\u304F\u3060\u3055\u3044\u3002</div></details>
        <details class="faq-item"><summary>\u30A2\u30D7\u30EA\u306F\u7121\u6599\u3067\u3059\u304B\uFF1F</summary><div class="answer">\u306F\u3044\u3001\u3059\u3079\u3066\u306E\u6A5F\u80FD\u3092\u7121\u6599\u3067\u3054\u5229\u7528\u3044\u305F\u3060\u3051\u307E\u3059\u3002\u5E83\u544A\u3082\u8868\u793A\u3055\u308C\u307E\u305B\u3093\u3002</div></details>
        <details class="faq-item"><summary>\u6587\u5B57\u6697\u8A18\u3068\u97F3\u58F0\u6697\u8A18\u306E\u9055\u3044\u306F\u4F55\u3067\u3059\u304B\uFF1F</summary><div class="answer">\u6587\u5B57\u6697\u8A18\u30E2\u30FC\u30C9\u3067\u306F\u6F22\u5B57\u3068\u30D4\u30F3\u30A4\u30F3\u304C\u8868\u793A\u3055\u308C\u3001\u8996\u899A\u7684\u306B\u5358\u8A9E\u3092\u899A\u3048\u307E\u3059\u3002\u97F3\u58F0\u6697\u8A18\u30E2\u30FC\u30C9\u3067\u306F\u4E2D\u56FD\u8A9E\u304C\u96A0\u3055\u308C\u305F\u72B6\u614B\u3067\u3001\u97F3\u58F0\u3092\u8074\u3044\u3066\u610F\u5473\u3092\u7406\u89E3\u3059\u308B\u7DF4\u7FD2\u304C\u3067\u304D\u307E\u3059\u3002\u305D\u308C\u305E\u308C\u306E\u6697\u8A18\u72B6\u6CC1\u306F\u5225\u3005\u306B\u7BA1\u7406\u3055\u308C\u307E\u3059\u3002</div></details>
      </section>
      <section id="contact">
        <h2>\u304A\u554F\u3044\u5408\u308F\u305B</h2>
        <div class="contact-box">
          <p>\u30A2\u30D7\u30EA\u306B\u95A2\u3059\u308B\u3054\u8CEA\u554F\u3001\u3054\u8981\u671B\u3001\u4E0D\u5177\u5408\u306E\u3054\u5831\u544A\u306A\u3069\u3001<br />\u304A\u6C17\u8EFD\u306B\u304A\u554F\u3044\u5408\u308F\u305B\u304F\u3060\u3055\u3044\u3002</p>
          <a href="mailto:hiroshi.chin@gmail.com" class="contact-email">hiroshi.chin@gmail.com</a>
        </div>
      </section>
      <section id="privacy" class="privacy-section">
        <h2>\u30D7\u30E9\u30A4\u30D0\u30B7\u30FC\u30DD\u30EA\u30B7\u30FC</h2>
        <p>\u6700\u7D42\u66F4\u65B0\u65E5: 2026\u5E742\u67085\u65E5</p>
        <h3>\u53CE\u96C6\u3059\u308B\u60C5\u5831</h3>
        <p>\u672C\u30A2\u30D7\u30EA\u306F\u3001\u30E6\u30FC\u30B6\u30FC\u306E\u500B\u4EBA\u60C5\u5831\u3092\u53CE\u96C6\u3057\u307E\u305B\u3093\u3002\u5B66\u7FD2\u306E\u9032\u6357\u72B6\u6CC1\uFF08\u6697\u8A18\u6E08\u307F\u30FB\u672A\u6697\u8A18\u306E\u5358\u8A9E\u306A\u3069\uFF09\u306F\u304A\u4F7F\u3044\u306E\u30C7\u30D0\u30A4\u30B9\u5185\u306B\u306E\u307F\u4FDD\u5B58\u3055\u308C\u3001\u5916\u90E8\u30B5\u30FC\u30D0\u30FC\u306B\u9001\u4FE1\u3055\u308C\u308B\u3053\u3068\u306F\u3042\u308A\u307E\u305B\u3093\u3002</p>
        <h3>\u30C7\u30FC\u30BF\u306E\u5171\u6709</h3>
        <p>\u672C\u30A2\u30D7\u30EA\u306F\u3001\u7B2C\u4E09\u8005\u3068\u30E6\u30FC\u30B6\u30FC\u306E\u30C7\u30FC\u30BF\u3092\u5171\u6709\u3059\u308B\u3053\u3068\u306F\u3042\u308A\u307E\u305B\u3093\u3002</p>
        <h3>\u5206\u6790\u30C4\u30FC\u30EB\u30FB\u5E83\u544A</h3>
        <p>\u672C\u30A2\u30D7\u30EA\u306F\u3001\u5206\u6790\u30C4\u30FC\u30EB\u304A\u3088\u3073\u5E83\u544A\u3092\u4F7F\u7528\u3057\u3066\u3044\u307E\u305B\u3093\u3002</p>
        <h3>\u5B50\u4F9B\u306E\u30D7\u30E9\u30A4\u30D0\u30B7\u30FC</h3>
        <p>\u672C\u30A2\u30D7\u30EA\u306F\u5168\u5E74\u9F62\u306E\u30E6\u30FC\u30B6\u30FC\u306B\u9069\u3057\u3066\u304A\u308A\u300113\u6B73\u672A\u6E80\u306E\u5B50\u4F9B\u304B\u3089\u610F\u56F3\u7684\u306B\u500B\u4EBA\u60C5\u5831\u3092\u53CE\u96C6\u3059\u308B\u3053\u3068\u306F\u3042\u308A\u307E\u305B\u3093\u3002</p>
        <h3>\u30C7\u30FC\u30BF\u306E\u4FDD\u6301</h3>
        <p>\u5B66\u7FD2\u30C7\u30FC\u30BF\u306F\u30C7\u30D0\u30A4\u30B9\u306E\u30ED\u30FC\u30AB\u30EB\u30B9\u30C8\u30EC\u30FC\u30B8\u306B\u4FDD\u5B58\u3055\u308C\u307E\u3059\u3002\u30A2\u30D7\u30EA\u3092\u524A\u9664\u3059\u308B\u3068\u3001\u3059\u3079\u3066\u306E\u30ED\u30FC\u30AB\u30EB\u30C7\u30FC\u30BF\u3082\u524A\u9664\u3055\u308C\u307E\u3059\u3002</p>
        <h3>\u30E6\u30FC\u30B6\u30FC\u306E\u6A29\u5229</h3>
        <ul>
          <li>\u30A2\u30D7\u30EA\u5185\u306E\u300C\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u300D\u753B\u9762\u304B\u3089\u3059\u3079\u3066\u306E\u5B66\u7FD2\u30C7\u30FC\u30BF\u3092\u30EA\u30BB\u30C3\u30C8\u3067\u304D\u307E\u3059</li>
          <li>\u30A2\u30D7\u30EA\u3092\u30A2\u30F3\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB\u3059\u308B\u3053\u3068\u3067\u3001\u3059\u3079\u3066\u306E\u30ED\u30FC\u30AB\u30EB\u30C7\u30FC\u30BF\u3092\u524A\u9664\u3067\u304D\u307E\u3059</li>
        </ul>
        <h3>\u5909\u66F4\u306B\u3064\u3044\u3066</h3>
        <p>\u672C\u30D7\u30E9\u30A4\u30D0\u30B7\u30FC\u30DD\u30EA\u30B7\u30FC\u306F\u3001\u5FC5\u8981\u306B\u5FDC\u3058\u3066\u66F4\u65B0\u3055\u308C\u308B\u3053\u3068\u304C\u3042\u308A\u307E\u3059\u3002\u91CD\u8981\u306A\u5909\u66F4\u304C\u3042\u308B\u5834\u5408\u306F\u3001\u30A2\u30D7\u30EA\u306E\u30A2\u30C3\u30D7\u30C7\u30FC\u30C8\u3092\u901A\u3058\u3066\u304A\u77E5\u3089\u305B\u3057\u307E\u3059\u3002</p>
        <h3>\u304A\u554F\u3044\u5408\u308F\u305B</h3>
        <p>\u672C\u30D7\u30E9\u30A4\u30D0\u30B7\u30FC\u30DD\u30EA\u30B7\u30FC\u306B\u95A2\u3059\u308B\u3054\u8CEA\u554F\u304C\u3054\u3056\u3044\u307E\u3057\u305F\u3089\u3001<a href="mailto:hiroshi.chin@gmail.com">hiroshi.chin@gmail.com</a> \u307E\u3067\u304A\u554F\u3044\u5408\u308F\u305B\u304F\u3060\u3055\u3044\u3002</p>
      </section>
    </div>
    <footer>&copy; 2026 HSK\u53D7\u9A13\u8005\u304C\u4F5C\u3063\u305F\u5358\u8A9E\u5E33</footer>
    <script>
      document.querySelectorAll('nav a').forEach(function(link) {
        link.addEventListener('click', function(e) {
          e.preventDefault();
          var target = document.querySelector(this.getAttribute('href'));
          if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
          document.querySelectorAll('nav a').forEach(function(l) { l.classList.remove('active'); });
          this.classList.add('active');
        });
      });
    </script>
  </body>
</html>`;

// server/index.ts
var app = express();
var log = console.log;
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    const origin = req.header("origin");
    const isLocalhost = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path2 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path2.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const appName = getAppName();
  log("Serving static Expo files with dynamic manifest routing");
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path !== "/" && req.path !== "/manifest" && req.path !== "/support" && req.path !== "/privacy" && req.path !== "/privacy-policy" && req.path !== "/terms") {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    if (req.path === "/privacy-policy") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(privacyPolicyHtml);
    }
    if (req.path === "/terms") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(termsOfUseHtml);
    }
    if (req.path === "/support" || req.path === "/privacy") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(supportHtml);
    }
    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate: landingPageHtml,
        appName
      });
    }
    next();
  });
  app2.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app2.use(express.static(path.resolve(process.cwd(), "static-build")));
  log("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
}
(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  app.get("/privacy-policy", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(privacyPolicyHtml);
  });
  app.get("/terms", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(termsOfUseHtml);
  });
  app.get("/support", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(supportHtml);
  });
  configureExpoAndLanding(app);
  const server = await registerRoutes(app);
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`express server serving on port ${port}`);
    }
  );
})();
