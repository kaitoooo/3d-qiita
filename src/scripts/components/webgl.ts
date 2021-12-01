import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import throttle from 'lodash.throttle';
import { gsap } from 'gsap';
import { Group } from 'three';

export default class WebGL {
    winSize: {
        [s: string]: number;
    };
    elms: {
        [s: string]: HTMLElement;
    };
    loadingText: NodeListOf<HTMLElement>;
    dpr: number;
    three: {
        scene: THREE.Scene;
        renderer: THREE.WebGLRenderer | null;
        clock: THREE.Clock;
        redraw: Group | null;
        camera: THREE.PerspectiveCamera | null;
        cameraFov: number;
        cameraAspect: number;
    };
    sp: boolean;
    ua: string;
    mq: MediaQueryList;
    srcObj: string;
    flg: {
        [s: string]: boolean;
    };
    constructor() {
        this.winSize = {
            wd: window.innerWidth,
            wh: window.innerHeight,
        };
        this.elms = {
            canvas: document.querySelector('[data-canvas]'),
            loadingParent: document.querySelector('[data-loading="parent"]'),
            mvTitle: document.querySelector('[data-mv="title"]'),
            mvSubTitle: document.querySelector('[data-mv="subTitle"]'),
            mvHomeLink: document.querySelector('[data-mv="homeLink"]'),
            mvQiitaLink: document.querySelector('[data-mv="qiitaLink"]'),
            mvGitLink: document.querySelector('[data-mv="gitLink"]'),
            mvTwitterLink: document.querySelector('[data-mv="twitterLink"]'),
        };
        this.loadingText = document.querySelectorAll('.loading__text');
        // デバイスピクセル比(最大値=2)
        this.dpr = Math.min(window.devicePixelRatio, 2);
        this.three = {
            scene: null,
            renderer: null,
            clock: null,
            redraw: null,
            camera: null,
            cameraFov: 50,
            cameraAspect: window.innerWidth / window.innerHeight,
        };
        this.sp = null;
        this.ua = window.navigator.userAgent.toLowerCase();
        this.mq = window.matchMedia('(max-width: 768px)');
        this.srcObj = './obj/qiitan.glb';
        this.flg = {
            loaded: false,
        };
        this.init();
    }
    init(): void {
        this.getLayout();
        this.initScene();
        this.initCamera();
        this.initRenderer();
        this.setLoading();
        this.setLight();
        this.handleEvents();

        if (this.ua.indexOf('msie') !== -1 || this.ua.indexOf('trident') !== -1) {
            return;
        } else {
            this.mq.addEventListener('change', this.getLayout.bind(this));
        }
    }
    getLayout(): void {
        this.sp = this.mq.matches ? true : false;
    }
    initScene(): void {
        // シーンを作成
        this.three.scene = new THREE.Scene();
    }
    initCamera(): void {
        // カメラを作成(視野角, スペクト比, near, far)
        this.three.camera = new THREE.PerspectiveCamera(this.three.cameraFov, this.winSize.wd / this.winSize.wh, this.three.cameraAspect, 1000);
        this.three.camera.position.set(0, 0, 9);
    }
    initRenderer(): void {
        // レンダラーを作成
        this.three.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true, //背景色を設定しないとき、背景を透明にする
        });
        // this.three.renderer.setClearColor(0xffffff); //背景色
        this.three.renderer.setPixelRatio(this.dpr); // retina対応
        this.three.renderer.setSize(this.winSize.wd, this.winSize.wh); // 画面サイズをセット
        this.three.renderer.physicallyCorrectLights = true;
        this.three.renderer.shadowMap.enabled = true; // シャドウを有効にする
        this.three.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // PCFShadowMapの結果から更に隣り合う影との間を線形補間して描画する
        this.elms.canvas.appendChild(this.three.renderer.domElement); // HTMLにcanvasを追加
        this.three.renderer.outputEncoding = THREE.GammaEncoding; // 出力エンコーディングを定義
    }
    setLight() {
        const positionArr = [
            [0, 5, 0, 2],
            [-5, 3, 2, 2],
            [5, 3, 2, 2],
            [0, 3, 5, 1],
            [0, 3, -5, 2],
        ];

        for (let i = 0; i < positionArr.length; i++) {
            // 平行光源(色, 光の強さ)
            const directionalLight = new THREE.DirectionalLight(0xffffff, positionArr[i][3]);
            directionalLight.position.set(positionArr[i][0], positionArr[i][1], positionArr[i][2]);

            if (i == 0 || i == 2 || i == 3) {
                directionalLight.castShadow = true;
                directionalLight.shadow.camera.top = 50;
                directionalLight.shadow.camera.bottom = -50;
                directionalLight.shadow.camera.right = 50;
                directionalLight.shadow.camera.left = -50;
                directionalLight.shadow.mapSize.set(4096, 4096);
            }
            this.three.scene.add(directionalLight);
        }
    }
    setLoading() {
        // glTF形式の3Dモデルを読み込む
        const loader = new GLTFLoader();
        loader.load(this.srcObj, (obj) => {
            const data = obj.scene;

            this.three.redraw = data; // 3Dモデルをredrawに入れる
            // data.scale.set(this.sp ? 0.1 : 0.8, this.sp ? 0.1 : 0.8, this.sp ? 0.1 : 0.8);
            this.three.scene.add(data); // シーンに3Dモデルを追加
            this.flg.loaded = true;
            this.rendering(); // レンダリングを開始する
        });
    }
    rendering(): void {
        // レンダリングを実行
        requestAnimationFrame(this.rendering.bind(this));
        this.three.renderer.render(this.three.scene, this.three.camera);
        this.animate(); // アニメーション開始
    }
    animate() {
        gsap.config({
            force3D: true,
        });
        const tl = gsap.timeline({
            paused: true,
            defaults: {
                duration: 0.6,
                ease: 'power2.easeOut',
            },
        });
        // ローディング
        // テキストアニメーション
        tl.to(this.loadingText, {
            opacity: 1,
            stagger: 0.04,
            y: 0,
        });
        tl.to(this.elms.loadingParent, {
            ease: 'power2.ease',
            opacity: 0,
        });
        // 回転
        tl.to(this.three.redraw.rotation, {
            duration: 1.6,
            y: 6,
        });
        // 回転
        tl.to(this.three.redraw.rotation, {
            duration: 0.6,
            z: 0.2,
        });
        // 拡大
        tl.to(this.three.redraw.scale, {
            duration: 0.6,
            x: 2,
            y: 2,
            z: 2,
        });
        tl.to(this.elms.loadingParent, {
            duration: 0.1,
            ease: 'power1.ease',
            visibility: 'hidden',
        });
        // テキストアニメーション
        tl.to(this.elms.mvTitle, {
            opacity: 1,
            y: 0,
        });
        // テキストアニメーション
        tl.to(this.elms.mvSubTitle, {
            opacity: 1,
            y: 0,
        });
        tl.to(this.elms.mvHomeLink, {
            duration: 0.3,
            ease: 'power2.ease',
            opacity: 1,
        });
        // テキストアニメーション（リンク）
        tl.to(this.elms.mvQiitaLink, {
            duration: 0.3,
            ease: 'power2.ease',
            opacity: 1,
        });
        // テキストアニメーション（リンク）
        tl.to(this.elms.mvGitLink, {
            duration: 0.3,
            ease: 'power2.ease',
            opacity: 1,
        });
        // テキストアニメーション（リンク）
        tl.to(this.elms.mvTwitterLink, {
            duration: 0.3,
            ease: 'power2.ease',
            opacity: 1,
        });
        tl.play();
    }
    handleEvents(): void {
        // リサイズイベント登録
        window.addEventListener(
            'resize',
            throttle(() => {
                this.handleResize();
            }, 100),
            false
        );
    }
    handleResize(): void {
        // リサイズ処理
        this.winSize = {
            wd: window.innerWidth,
            wh: window.innerHeight,
        };
        this.dpr = Math.min(window.devicePixelRatio, 2);
        if (this.three.camera) {
            // カメラの位置更新
            this.three.camera.aspect = this.winSize.wd / this.winSize.wh;
            this.three.camera.updateProjectionMatrix();
        }
        if (this.three.renderer) {
            // レンダラーの大きさ更新
            this.three.renderer.setSize(this.winSize.wd, this.winSize.wh);
            this.three.renderer.setPixelRatio(this.dpr);
        }
    }
}
