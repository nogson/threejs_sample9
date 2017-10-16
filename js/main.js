(() => {

  window.addEventListener('load', () => {

    // 汎用変数の宣言
    let width = window.innerWidth; // ブラウザのクライアント領域の幅
    let height = window.innerHeight; // ブラウザのクライアント領域の高さ
    let targetDOM = document.getElementById('webgl'); // スクリーンとして使う DOM

    // three.js 定義されているオブジェクトに関連した変数を宣言
    let scene; // シーン
    let camera; // カメラ
    let renderer; // レンダラ
    let axis; //ガイド
    let grid; //ガイド
    let directional;
    let ambient;

    //audio関連の変数
    let context;
    let analyser;
    let bufferLength;
    let dataArray;
    let source;
    let fftSize;


    // 各種パラメータを設定するために定数オブジェクトを定義
    let CAMERA_PARAMETER = { // カメラに関するパラメータ
      fovy: 90,
      aspect: width / height,
      near: 0.1,
      far: 100.0,
      x: 0.0, // + 右 , - 左
      y: 2, // + 上, - 下
      z: 8.5, // + 手前, - 奥
      lookAt: new THREE.Vector3(0.0, 0.0, 0.0) //x,y,z
    };
    let RENDERER_PARAMETER = { // レンダラに関するパラメータ
      clearColor: 0x000000, //背景のリセットに使う色
      width: width,
      height: height
    };

    let LIGHT_PARAMETER = {
      directional: {
        positionX: 10,
        positionY: 4,
        positionZ: 3
      },
      ambient: {
        positionY: 1
      }
    };

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
      CAMERA_PARAMETER.fovy,
      CAMERA_PARAMETER.aspect,
      CAMERA_PARAMETER.near,
      CAMERA_PARAMETER.far
    );

    camera.position.x = CAMERA_PARAMETER.x;
    camera.position.y = CAMERA_PARAMETER.y;
    camera.position.z = CAMERA_PARAMETER.z;
    camera.lookAt(CAMERA_PARAMETER.lookAt); //注視点（どこをみてるの？）

    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(new THREE.Color(RENDERER_PARAMETER.clearColor));
    renderer.setPixelRatio(window.devicePixelRatio); //Retina対応
    renderer.setSize(RENDERER_PARAMETER.width, RENDERER_PARAMETER.height);

    targetDOM.appendChild(renderer.domElement); //canvasを挿入する

    let controls = new THREE.OrbitControls(camera, render.domElement);

    //ライト
    directional = new THREE.DirectionalLight(0xffffff);
    ambient = new THREE.AmbientLight(0xffffff, 0.25);

    directional.castShadow = true;

    directional.position.y = LIGHT_PARAMETER.directional.positionY;
    directional.position.z = LIGHT_PARAMETER.directional.positionZ;
    directional.position.x = LIGHT_PARAMETER.directional.positionX;
    ambient.position.y = LIGHT_PARAMETER.ambient.positionY;

    scene.add(directional);
    scene.add(ambient);

    //オブジェクトを追加
    let geometry = new THREE.SphereBufferGeometry(3, 7, 7);
    // var geometry = new THREE.BoxGeometry( 1, 1, 1 );
    let material = new THREE.MeshBasicMaterial({
      color: 0x333333,
      wireframe: true
    });
    let sphere = new THREE.Mesh(geometry, material);

    //頂点データ
    let attributes = _.cloneDeep(geometry.attributes);
    //頂点数
    let vertexCount = attributes.position.count;
    //頂点データ
    let attributesPos = attributes.position.array;

    //fftSizeは2の累乗出ない場合エラーとなるので注意
    fftSize = vertexCount * 2;
    scene.add(sphere);

    audioInit();
    render();

    function audioInit() {
      context = new AudioContext();
      analyser = context.createAnalyser();
      analyser.minDecibels = -90; //最小値
      analyser.maxDecibels = 0; //最大値
      analyser.smoothingTimeConstant = 0.65;
      analyser.fftSize = fftSize; //音域の数

      bufferLength = analyser.frequencyBinCount; //fftSizeの半分のサイズ
      dataArray = new Uint8Array(bufferLength); //波形データ格納用の配列を初期化
      analyser.getByteFrequencyData(dataArray); //周波数領域の波形データを取得

      //マイクの音を取得
      navigator.webkitGetUserMedia({
          audio: true
        },
        function (stream) {
          source = context.createMediaStreamSource(stream);
          // オーディオの出力先を設定
          source.connect(analyser);
        },
        function (err) {
          console.log(err);
        }
      );
    }

    function setPosition() {
      // それぞれの周波数の振幅を取得
      analyser.getByteFrequencyData(dataArray);

      let pos = geometry.attributes.position.array;

      //ポジションをセット
      for (let i = 0; i < vertexCount; i++) {
        let j = i * 3;
        let x = dataArray[j] !== void 0 ? dataArray[j] : 0;
        let y = dataArray[j + 1] !== void 0 ? dataArray[j + 1] : 0;
        let z = dataArray[j + 2] !== void 0 ? dataArray[j + 2] : 0;
       
        let size = Math.sqrt(x * x + y * y + z * z);
        let normalize = [x / size * 2 - 1, y / size * 2 - 1, z / size * 2 - 1];


        if(Number.isNaN(normalize[0])){
          normalize[0] = 0;
        }

        if(Number.isNaN(normalize[1])){
          normalize[1] = 0;
        }

        if(Number.isNaN(normalize[2])){
          normalize[2] = 0;
        }

        x =  attributesPos[j]+normalize[0]/2;
        y =  attributesPos[j+1]+normalize[1]/2;
        z =  attributesPos[j+2]+normalize[2]/2;
        
        
        geometry.attributes.position.setXYZ(i,x, y,z)
      }

    }

    //描画
    function render() {

      // rendering
      renderer.render(scene, camera);

      setPosition();
      geometry.attributes.position.needsUpdate = true;
      geometry.computeFaceNormals();
      geometry.computeVertexNormals();

      // animation
      requestAnimationFrame(render);
    }

  }, false);
})();
