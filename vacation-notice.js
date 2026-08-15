(function () {
    'use strict';

    const NOTICE_ACTIVE = true;
    const NOTICE_ID = 'eco-vacation-notice';
    const STORAGE_KEY = 'eco-vacation-notice-dismissed-v1';
    const EXEMPT_CITY_PATTERN = /(?:^|-)(kalocsa|baja|kiskoros|szekszard|paks|solt|dunafoldvar)(?:\.|$)/i;
    const EXEMPT_PAGES = /^(karpittisztitas-matractisztitas)(?:\.|$)/i;

    function isExemptCityPage() {
        const pageName = decodeURIComponent(window.location.pathname.split('/').pop() || 'index.html');
        return EXEMPT_PAGES.test(pageName) || EXEMPT_CITY_PATTERN.test(pageName);
    }

    function wasDismissed() {
        try {
            return window.sessionStorage.getItem(STORAGE_KEY) === 'true';
        } catch (error) {
            return false;
        }
    }

    function rememberDismissal() {
        try {
            window.sessionStorage.setItem(STORAGE_KEY, 'true');
        } catch (error) {
            // The notice can still be closed when storage is unavailable.
        }
    }

    function addStyles() {
        if (document.getElementById(`${NOTICE_ID}-styles`)) return;

        const style = document.createElement('style');
        style.id = `${NOTICE_ID}-styles`;
        style.textContent = `
            #${NOTICE_ID} {
                width: min(92vw, 620px);
                max-width: 620px;
                margin: auto;
                padding: 0;
                overflow: visible;
                color: #17352c;
                background: transparent;
                border: 0;
                font-family: inherit;
            }

            #${NOTICE_ID}::backdrop {
                background: rgba(9, 31, 24, 0.72);
                backdrop-filter: blur(7px);
                -webkit-backdrop-filter: blur(7px);
                animation: eco-vacation-backdrop-in 220ms ease-out both;
            }

            #${NOTICE_ID} .eco-vacation-card {
                position: relative;
                overflow: hidden;
                padding: clamp(28px, 6vw, 48px);
                background:
                    radial-gradient(circle at 92% 8%, rgba(255, 211, 105, 0.35), transparent 26%),
                    linear-gradient(145deg, #fbfff7 0%, #eef8e8 100%);
                border: 1px solid rgba(35, 112, 79, 0.18);
                border-radius: 28px;
                box-shadow: 0 28px 80px rgba(4, 24, 17, 0.28);
                animation: eco-vacation-card-in 280ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
            }

            #${NOTICE_ID} .eco-vacation-card::after {
                content: '';
                position: absolute;
                right: -72px;
                bottom: -98px;
                width: 210px;
                height: 210px;
                border: 24px solid rgba(36, 143, 92, 0.08);
                border-radius: 50%;
                pointer-events: none;
            }

            #${NOTICE_ID} .eco-vacation-eyebrow {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                margin: 0 0 16px;
                color: #1d7652;
                font-size: 0.76rem;
                font-weight: 800;
                letter-spacing: 0.14em;
                line-height: 1;
                text-transform: uppercase;
            }

            #${NOTICE_ID} .eco-vacation-eyebrow::before {
                content: '';
                width: 9px;
                height: 9px;
                background: #f1b83b;
                border-radius: 50%;
                box-shadow: 0 0 0 5px rgba(241, 184, 59, 0.18);
            }

            #${NOTICE_ID} h2 {
                max-width: 500px;
                margin: 0;
                color: #143e31;
                font-size: clamp(2rem, 7vw, 3.35rem);
                font-weight: 800;
                letter-spacing: -0.045em;
                line-height: 0.98;
            }

            #${NOTICE_ID} .eco-vacation-lead {
                max-width: 500px;
                margin: 20px 0 0;
                color: #365a4e;
                font-size: clamp(1rem, 2.6vw, 1.12rem);
                line-height: 1.65;
            }

            #${NOTICE_ID} .eco-vacation-available {
                position: relative;
                z-index: 1;
                margin: 24px 0 0;
                padding: 16px 18px;
                color: #234a3d;
                background: rgba(255, 255, 255, 0.72);
                border-left: 4px solid #2a8a61;
                border-radius: 0 14px 14px 0;
                font-size: 0.94rem;
                line-height: 1.55;
            }

            #${NOTICE_ID} .eco-vacation-available strong {
                color: #153e31;
            }

            #${NOTICE_ID} .eco-vacation-actions {
                position: relative;
                z-index: 1;
                display: flex;
                align-items: center;
                gap: 16px;
                margin-top: 28px;
            }

            #${NOTICE_ID} .eco-vacation-confirm {
                min-height: 48px;
                padding: 0 24px;
                color: #ffffff;
                background: #176b4a;
                border: 0;
                border-radius: 999px;
                box-shadow: 0 10px 24px rgba(23, 107, 74, 0.22);
                cursor: pointer;
                font: inherit;
                font-weight: 750;
                transition: transform 160ms ease, background-color 160ms ease, box-shadow 160ms ease;
            }

            #${NOTICE_ID} .eco-vacation-confirm:hover {
                background: #105b3e;
                box-shadow: 0 12px 30px rgba(23, 107, 74, 0.3);
                transform: translateY(-1px);
            }

            #${NOTICE_ID} .eco-vacation-confirm:focus-visible,
            #${NOTICE_ID} .eco-vacation-close:focus-visible {
                outline: 3px solid #f1b83b;
                outline-offset: 3px;
            }

            #${NOTICE_ID} .eco-vacation-thanks {
                color: #557167;
                font-size: 0.86rem;
            }

            #${NOTICE_ID} .eco-vacation-close {
                position: absolute;
                z-index: 2;
                top: 16px;
                right: 16px;
                display: grid;
                width: 42px;
                height: 42px;
                place-items: center;
                padding: 0;
                color: #32594c;
                background: rgba(255, 255, 255, 0.72);
                border: 1px solid rgba(28, 92, 68, 0.14);
                border-radius: 50%;
                cursor: pointer;
                font: 300 1.6rem/1 sans-serif;
                transition: background-color 160ms ease, transform 160ms ease;
            }

            #${NOTICE_ID} .eco-vacation-close:hover {
                background: #ffffff;
                transform: rotate(4deg);
            }

            @keyframes eco-vacation-backdrop-in {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes eco-vacation-card-in {
                from { opacity: 0; transform: translateY(22px) scale(0.98); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }

            @media (max-width: 520px) {
                #${NOTICE_ID} {
                    width: calc(100vw - 24px);
                }

                #${NOTICE_ID} .eco-vacation-card {
                    padding: 34px 24px 26px;
                    border-radius: 22px;
                }

                #${NOTICE_ID} .eco-vacation-actions {
                    align-items: stretch;
                    flex-direction: column;
                    gap: 12px;
                    text-align: center;
                }

                #${NOTICE_ID} .eco-vacation-confirm {
                    width: 100%;
                }
            }

            @media (prefers-reduced-motion: reduce) {
                #${NOTICE_ID}::backdrop,
                #${NOTICE_ID} .eco-vacation-card {
                    animation: none;
                }

                #${NOTICE_ID} .eco-vacation-confirm,
                #${NOTICE_ID} .eco-vacation-close {
                    transition: none;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function showNotice() {
        if (!NOTICE_ACTIVE || document.getElementById(NOTICE_ID) || isExemptCityPage() || wasDismissed()) return;

        addStyles();

        const dialog = document.createElement('dialog');
        dialog.id = NOTICE_ID;
        dialog.setAttribute('aria-labelledby', `${NOTICE_ID}-title`);
        dialog.setAttribute('aria-describedby', `${NOTICE_ID}-description`);
        dialog.innerHTML = `
            <div class="eco-vacation-card">
                <button class="eco-vacation-close" type="button" aria-label="Értesítés bezárása">×</button>
                <p class="eco-vacation-eyebrow">Fontos területi információ</p>
                <h2 id="${NOTICE_ID}-title">Szabadságon vagyunk</h2>
                <p class="eco-vacation-lead" id="${NOTICE_ID}-description">
                    Ezen a területen jelenleg szünetel a munkavégzésünk.
                </p>
                <p class="eco-vacation-available">
                    <strong>Továbbra is elérhetőek vagyunk:</strong><br>
                    Kalocsa, Baja, Kiskőrös, Szekszárd, Paks, Solt és Dunaföldvár térségében.
                </p>
                <div class="eco-vacation-actions">
                    <button class="eco-vacation-confirm" type="button">Értem</button>
                    <span class="eco-vacation-thanks">Köszönjük a megértést!</span>
                </div>
            </div>
        `;

        function dismissNotice() {
            rememberDismissal();
            if (typeof dialog.close === 'function') {
                dialog.close();
            } else {
                dialog.removeAttribute('open');
            }
        }

        dialog.querySelector('.eco-vacation-confirm').addEventListener('click', dismissNotice);
        dialog.querySelector('.eco-vacation-close').addEventListener('click', dismissNotice);
        dialog.addEventListener('cancel', function (event) {
            event.preventDefault();
            dismissNotice();
        });

        document.body.appendChild(dialog);

        if (typeof dialog.showModal === 'function') {
            dialog.showModal();
        } else {
            dialog.setAttribute('open', '');
        }
    }

    if (document.body) {
        showNotice();
    } else {
        const bodyObserver = new MutationObserver(function () {
            if (!document.body) return;

            bodyObserver.disconnect();
            showNotice();
        });
        bodyObserver.observe(document.documentElement, { childList: true, subtree: true });
    }
})();
