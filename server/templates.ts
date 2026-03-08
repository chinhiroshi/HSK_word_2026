export const landingPageHtml = `<!doctype html>
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

export const privacyPolicyHtml = `<!doctype html>
<html lang="ja">
  <head>
    <title>HSK受験者が作った単語帳 - プライバシーポリシー</title>
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
      <h1>プライバシーポリシー</h1>
      <p class="tagline">HSK受験者が作った単語帳</p>
    </div>
    <div class="container">
      <p class="update-date">最終更新日: 2026年3月7日</p>
      <section>
        <h2>はじめに</h2>
        <p>「HSK受験者が作った単語帳」（以下「本アプリ」）は、ユーザーのプライバシーを尊重し、個人情報の保護に努めています。本プライバシーポリシーは、本アプリがどのような情報を収集し、どのように利用するかを説明します。</p>
      </section>
      <section>
        <h2>収集する情報</h2>
        <h3>ローカルデータ</h3>
        <p>本アプリは、学習の進捗状況（暗記済み・未暗記の単語、学習回数など）をお使いのデバイス内にのみ保存します。これらのデータは外部サーバーに送信されることはありません。</p>
        <h3>サブスクリプション情報</h3>
        <p>本アプリではアプリ内課金（サブスクリプション）を提供しています。課金処理はApple App Store / Google Play Storeおよび RevenueCat を通じて行われます。購入に関する情報（購入履歴、サブスクリプションステータスなど）はこれらのプラットフォームによって管理されます。</p>
      </section>
      <section>
        <h2>第三者サービス</h2>
        <p>本アプリは以下の第三者サービスを使用しています：</p>
        <ul>
          <li><strong>RevenueCat</strong>: サブスクリプションの管理に使用。RevenueCatのプライバシーポリシーは <a href="https://www.revenuecat.com/privacy" target="_blank" rel="noopener noreferrer">こちら</a> をご覧ください。</li>
          <li><strong>Apple App Store / Google Play Store</strong>: アプリの配信および課金処理に使用。</li>
        </ul>
      </section>
      <section>
        <h2>データの共有</h2>
        <p>本アプリは、上記の第三者サービスを除き、ユーザーのデータを第三者と共有することはありません。</p>
      </section>
      <section>
        <h2>分析ツール・広告</h2>
        <p>本アプリは、分析ツールおよび広告を使用していません。</p>
      </section>
      <section>
        <h2>子供のプライバシー</h2>
        <p>本アプリは全年齢のユーザーに適しており、13歳未満の子供から意図的に個人情報を収集することはありません。</p>
      </section>
      <section>
        <h2>データの保持と削除</h2>
        <p>学習データはデバイスのローカルストレージに保存されます。以下の方法でデータを削除できます：</p>
        <ul>
          <li>アプリ内の「プロフィール」画面からすべての学習データをリセット</li>
          <li>アプリをアンインストールすることで、すべてのローカルデータを削除</li>
        </ul>
      </section>
      <section>
        <h2>変更について</h2>
        <p>本プライバシーポリシーは、必要に応じて更新されることがあります。重要な変更がある場合は、アプリのアップデートを通じてお知らせします。</p>
      </section>
      <section>
        <h2>お問い合わせ</h2>
        <p>本プライバシーポリシーに関するご質問がございましたら、<a href="mailto:hiroshi.chin@gmail.com">hiroshi.chin@gmail.com</a> までお問い合わせください。</p>
      </section>
    </div>
    <footer>&copy; 2026 HSK受験者が作った単語帳</footer>
  </body>
</html>`;

export const termsOfUseHtml = `<!doctype html>
<html lang="ja">
  <head>
    <title>HSK受験者が作った単語帳 - 利用規約</title>
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
      <h1>利用規約</h1>
      <p class="tagline">HSK受験者が作った単語帳</p>
    </div>
    <div class="container">
      <p class="update-date">最終更新日: 2026年3月7日</p>
      <section>
        <h2>第1条（適用）</h2>
        <p>本利用規約（以下「本規約」）は、「HSK受験者が作った単語帳」（以下「本アプリ」）の利用に関する条件を定めるものです。ユーザーは、本アプリをダウンロードまたは使用することにより、本規約に同意したものとみなされます。</p>
      </section>
      <section>
        <h2>第2条（サービス内容）</h2>
        <p>本アプリは、HSK（漢語水平考試）の受験対策として、中国語単語の学習支援サービスを提供します。主な機能は以下の通りです：</p>
        <ul>
          <li>HSK1級〜6級の単語の閲覧・学習</li>
          <li>文字暗記モード・音声暗記モードによる学習</li>
          <li>音声再生による連続学習</li>
          <li>学習進捗の管理</li>
        </ul>
      </section>
      <section>
        <h2>第3条（サブスクリプション）</h2>
        <h3>無料プラン</h3>
        <p>HSK1級の全単語およびHSK2〜6級の各レベル最初の50単語は、無料でご利用いただけます。</p>
        <h3>プレミアムプラン</h3>
        <p>HSK2〜6級の全単語にアクセスするには、月額サブスクリプション（¥380/月）への登録が必要です。</p>
        <h3>自動更新と解約</h3>
        <ul>
          <li>サブスクリプションは、現在の期間が終了する24時間前までにキャンセルしない限り、自動的に更新されます。</li>
          <li>更新時に、サブスクリプション料金がApple IDまたはGoogle Playアカウントに請求されます。</li>
          <li>サブスクリプションの管理およびキャンセルは、お使いのデバイスの設定画面から行えます。</li>
          <li>無料トライアル期間がある場合、未使用分はサブスクリプション購入時に失効します。</li>
        </ul>
      </section>
      <section>
        <h2>第4条（知的財産権）</h2>
        <p>本アプリに含まれるすべてのコンテンツ（テキスト、音声、デザイン、ソフトウェアなど）に関する知的財産権は、開発者またはそのライセンサーに帰属します。ユーザーは、個人的な学習目的以外で本アプリのコンテンツを複製、配布、修正することはできません。</p>
      </section>
      <section>
        <h2>第5条（禁止事項）</h2>
        <p>ユーザーは、以下の行為を行ってはなりません：</p>
        <ul>
          <li>本アプリの逆コンパイル、リバースエンジニアリング、または解析</li>
          <li>本アプリのコンテンツの無断転載・再配布</li>
          <li>本アプリの正常な運用を妨害する行為</li>
          <li>不正な方法によるサブスクリプションの取得</li>
        </ul>
      </section>
      <section>
        <h2>第6条（免責事項）</h2>
        <p>本アプリは「現状有姿」で提供されます。開発者は、以下について一切の責任を負いません：</p>
        <ul>
          <li>本アプリの内容の正確性、完全性、最新性</li>
          <li>本アプリの利用によるHSK試験の合否結果</li>
          <li>本アプリの利用に起因するデバイスの不具合やデータの損失</li>
          <li>サービスの中断、停止、変更</li>
        </ul>
      </section>
      <section>
        <h2>第7条（規約の変更）</h2>
        <p>開発者は、必要に応じて本規約を変更できるものとします。変更後の規約は、アプリのアップデートまたは本ページでの公開をもって効力を生じます。変更後も本アプリの利用を継続した場合、変更後の規約に同意したものとみなされます。</p>
      </section>
      <section>
        <h2>第8条（Apple標準EULA）</h2>
        <p>本アプリのご利用には、本規約に加えて、Apple Inc.の標準使用許諾契約（EULA）が適用されます。詳細は以下のリンクをご参照ください：</p>
        <p><a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noopener noreferrer">Apple標準使用許諾契約（EULA）</a></p>
      </section>
      <section>
        <h2>お問い合わせ</h2>
        <p>本規約に関するご質問がございましたら、<a href="mailto:hiroshi.chin@gmail.com">hiroshi.chin@gmail.com</a> までお問い合わせください。</p>
      </section>
    </div>
    <footer>&copy; 2026 HSK受験者が作った単語帳</footer>
  </body>
</html>`;

export const supportHtml = `<!doctype html>
<html lang="ja">
  <head>
    <title>HSK受験者が作った単語帳 - サポート</title>
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
      <h1>HSK受験者が作った単語帳</h1>
      <p class="tagline">HSK4級対応 - 聴いて覚える中国語単語帳</p>
    </div>
    <nav>
      <a href="#features" class="active">機能紹介</a>
      <a href="#faq">よくある質問</a>
      <a href="#contact">お問い合わせ</a>
      <a href="#privacy">プライバシー</a>
    </nav>
    <div class="container">
      <section id="about">
        <h2>アプリについて</h2>
        <p>「HSK受験者が作った単語帳」は、HSK（漢語水平考試）4級の必須単語約600語を収録した中国語語彙学習アプリです。実際のHSK受験経験をもとに、合格に直結する単語帳を作りました。</p>
        <p>文字暗記と音声暗記の2つのモードで、見て覚える・聴いて覚えるの両方からアプローチ。50語ずつのグループ分けで、計画的に学習を進められます。</p>
      </section>
      <section id="features">
        <h2>主な機能</h2>
        <div class="features">
          <div class="feature-card"><span class="icon" aria-hidden="true">&#x1F4D6;</span><h3>文字暗記モード</h3><p>漢字・ピンイン・例文を見ながら視覚的に記憶。暗記状況をフィルタリングして効率的に復習できます。</p></div>
          <div class="feature-card"><span class="icon" aria-hidden="true">&#x1F3A7;</span><h3>音声暗記モード</h3><p>中国語を隠した状態で音声から意味を理解。リスニング力と語彙力を同時に強化します。</p></div>
          <div class="feature-card"><span class="icon" aria-hidden="true">&#x1F50A;</span><h3>音声再生機能</h3><p>中国語・日本語・英語の例文を連続再生。0.5〜2倍速まで調整可能。通勤中のながら学習に最適。</p></div>
          <div class="feature-card"><span class="icon" aria-hidden="true">&#x1F4CA;</span><h3>進捗管理</h3><p>暗記済み・暗記必要・未暗記の3段階で進捗を可視化。苦手な単語を重点的に復習できます。</p></div>
        </div>
      </section>
      <section id="faq">
        <h2>よくある質問</h2>
        <details class="faq-item"><summary>どのレベルの単語が収録されていますか？</summary><div class="answer">現在はHSK4級の必須単語約600語を収録しています。他の級（1〜3級、5〜6級）の単語は今後のアップデートで追加予定です。</div></details>
        <details class="faq-item"><summary>インターネット接続は必要ですか？</summary><div class="answer">音声再生にはデバイスのテキスト読み上げ機能を使用しているため、基本的にオフラインでもご利用いただけます。初回ダウンロード後はインターネット接続なしで学習できます。</div></details>
        <details class="faq-item"><summary>学習データは他のデバイスに引き継げますか？</summary><div class="answer">現在、学習データはお使いのデバイス内にのみ保存されます。デバイス間の同期機能は今後のアップデートで検討しています。</div></details>
        <details class="faq-item"><summary>学習データをリセットしたい場合は？</summary><div class="answer">アプリ内の「プロフィール」画面から、すべての学習データをリセットできます。リセットすると暗記状況がすべて初期化されますのでご注意ください。</div></details>
        <details class="faq-item"><summary>アプリは無料ですか？</summary><div class="answer">はい、すべての機能を無料でご利用いただけます。広告も表示されません。</div></details>
        <details class="faq-item"><summary>文字暗記と音声暗記の違いは何ですか？</summary><div class="answer">文字暗記モードでは漢字とピンインが表示され、視覚的に単語を覚えます。音声暗記モードでは中国語が隠された状態で、音声を聴いて意味を理解する練習ができます。それぞれの暗記状況は別々に管理されます。</div></details>
      </section>
      <section id="contact">
        <h2>お問い合わせ</h2>
        <div class="contact-box">
          <p>アプリに関するご質問、ご要望、不具合のご報告など、<br />お気軽にお問い合わせください。</p>
          <a href="mailto:hiroshi.chin@gmail.com" class="contact-email">hiroshi.chin@gmail.com</a>
        </div>
      </section>
      <section id="privacy" class="privacy-section">
        <h2>プライバシーポリシー</h2>
        <p>最終更新日: 2026年2月5日</p>
        <h3>収集する情報</h3>
        <p>本アプリは、ユーザーの個人情報を収集しません。学習の進捗状況（暗記済み・未暗記の単語など）はお使いのデバイス内にのみ保存され、外部サーバーに送信されることはありません。</p>
        <h3>データの共有</h3>
        <p>本アプリは、第三者とユーザーのデータを共有することはありません。</p>
        <h3>分析ツール・広告</h3>
        <p>本アプリは、分析ツールおよび広告を使用していません。</p>
        <h3>子供のプライバシー</h3>
        <p>本アプリは全年齢のユーザーに適しており、13歳未満の子供から意図的に個人情報を収集することはありません。</p>
        <h3>データの保持</h3>
        <p>学習データはデバイスのローカルストレージに保存されます。アプリを削除すると、すべてのローカルデータも削除されます。</p>
        <h3>ユーザーの権利</h3>
        <ul>
          <li>アプリ内の「プロフィール」画面からすべての学習データをリセットできます</li>
          <li>アプリをアンインストールすることで、すべてのローカルデータを削除できます</li>
        </ul>
        <h3>変更について</h3>
        <p>本プライバシーポリシーは、必要に応じて更新されることがあります。重要な変更がある場合は、アプリのアップデートを通じてお知らせします。</p>
        <h3>お問い合わせ</h3>
        <p>本プライバシーポリシーに関するご質問がございましたら、<a href="mailto:hiroshi.chin@gmail.com">hiroshi.chin@gmail.com</a> までお問い合わせください。</p>
      </section>
    </div>
    <footer>&copy; 2026 HSK受験者が作った単語帳</footer>
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
