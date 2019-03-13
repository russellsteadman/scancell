import React, { Component } from 'react';
import './App.css';
import YeastS1 from './yeast.jpg';
import { SerializeImage, CreateCanvas } from './shared/Utils';
import UtilWorker from './shared/Util.worker.js';
import Classy from './shared/Classy';

const cx = Classy([]);

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      // points: [[0, 0], [0, 0], [0, 0], [0, 0]],
      points: [[ 244, 844 ],[ 214, 636 ],[ 1555, 548 ],[ 1556, 742 ]], // DEBUG
      pointStep: 0,
      wall: 0.06,
      res: 10,
      mCont: 3,
      thresh: 0.5,
      mDist: 3,
      percent: 0,
      error: false,
      count: 0,
      step: 1
    };

    if (typeof(Worker) !== 'undefined') {
      this.worker = UtilWorker();
      this.worker.onmessage = this.workerHandler;
    }
  }

  parseImage = async () => {
    let data = await SerializeImage(YeastS1);
    this.worker.postMessage({action: 'serialize', pass: data});
  };

  workerHandler = ({ data }) => {
    if (data.action === 'serialized') {
      CreateCanvas(data.pass, this._canvas);
      this.setState({
        step: 2
      });
    } else if (data.action === 'rectangulated') {
      CreateCanvas(data.pass, this._canvas);
      this.setState({
        step: 3,
        pointStep: 0
      });
    } else if (data.action === 'detected') {
      CreateCanvas(data.pass, this._canvas);
    } else if (data.action === 'counted') {
      CreateCanvas(data.pass, this._canvas);
      console.log('New count:', data.pass.count);
      this.setState({count: data.pass.count});
    } else if (data.action === 'status') {
      console.log(data.pass.percent);
      if (data.pass.error) return this.setState({error: true});
      if (data.pass.percent > this.state.percent + 0.01) this.setState({percent: data.pass.percent});
    }
  };

  canvasClick = ({clientX, clientY}) => {
    let { points, pointStep, step } = this.state;
    if (step !== 2) return;
    points = points.slice();

    let {x, y} = this._canvas.getBoundingClientRect();

    x = Math.round(clientX - x);
    y = Math.round(clientY - y);

    points[pointStep] = [x, y];

    pointStep++;
    if (pointStep === 4) pointStep = 0;

    console.log(points);

    this.setState({
      points,
      pointStep
    }, () => {
      if (pointStep === 0) this.worker.postMessage({action: 'rectangulate', pass: points});
    });
  };

  detectImage = () => {
    this.setState({
      step: 4,
      percent: 0
    }, () => {
      this.worker.postMessage({action: 'detect', pass: this.state.points.slice()});
    });
  };

  recopyImage = () => {
    this.worker.postMessage({action: 'copy', pass: null});
    this.setState({step: 2});
  };

  countImage = () => {
    this.worker.postMessage({action: 'count', pass: this.state.points.slice()});
  };

  updateConfig = () => {
    let { wall } = this.state;
    this.worker.postMessage({action: 'config', pass: {
      wall
    }});
  };

  numCling(name, ev) {
    this.setState({
      [name]: ev.target.value === '' ? '' : Number(ev.target.value)
    }, () => {
      this.updateConfig();
    });
  }

  fileChange = async (ev) => {
    if (ev.target.files && ev.target.files[0]) {
      let data = await SerializeImage(URL.createObjectURL(ev.target.files[0]));
      this.worker.postMessage({action: 'serialize', pass: data});
    }
  };

  render() {
    let { wall, res, mCont, mDist, thresh, step, percent } = this.state;

    return (
      <div className={cx('container')}>
        <header className={cx('py-3')}>
          <h1>Yeast Counter</h1>
        </header>
        <div>
          <div className={cx('ycanvas', {hide: step === 1 || step === 4})}>
            <canvas ref={(ref) => this._canvas = ref} onClick={this.canvasClick}></canvas>
          </div>

          {step === 1 ? (<div>
            <p>Upload a photo for processing. Photos have highest accuracy when they are landscape, and when HDR (high dynamic range) enabled.</p>

            <button className={cx('btn', 'btn-dark', 'btn-block')} onClick={() => this._file.click()}>
              Select Photo
            </button>
            <input type='file' className={cx('hide')} ref={(ref) => this._file = ref} onChange={this.fileChange}/>
          </div>) : null}

          {step === 2 ? (<div>
            <p>Click on the <b>inner corners</b> of the channel in the following order: <b>bottom left</b> &#x2199;, <b>top left</b> &#x2196;, <b>top right</b> &#x2197;, and <b>bottom right</b> &#x2198;.</p>
          </div>) : null}

          {step === 3 ? (<div>
            <p>Does this area look correct?</p>

            <div className={cx('btn-group', 'w-100')}>
              <button className={cx('btn', 'btn-light', 'w-100')} onClick={this.recopyImage}>No</button>
              <button className={cx('btn', 'btn-dark', 'w-100')} onClick={this.detectImage}>Yes</button>
            </div>
          </div>) : null}

          {step === 4 ? (<div>
            <h3 className={cx('my-3', 'text-center')}>Processing...</h3>

            <div className={cx('progress')}>
              <div className={cx('progress-bar')} role='progressbar' aria-valuenow={Math.round(percent * 100)}
              aria-valuemin='0' aria-valuemax='100' style={{width: (percent * 100) + '%'}}>
                <span className={cx('sr-only')}>{Math.round(percent * 100)}% Complete</span>
              </div>
            </div>

            <div className={cx('alert', 'alert-info')}>
              <b>Did you know?</b> Kombucha, a fermented tea drink, is made from a symbiotic culture of bacteria and yeast (SCOBY).
            </div>
          </div>) : null}

          <button onClick={this.parseImage}>Serialize</button>
          <button onClick={this.detectImage}>Detect</button>
          <button onClick={this.countImage}>Count</button>
          <div>
            <input type='number' min='0.01' max='0.15' step='0.005' placeholder='Wall Distance Coefficient' value={wall} onChange={this.numCling.bind(this, 'wall')} className={cx('form-control')}/>
            <input type='number' min='3' max='30' step='1' placeholder='Local Contrast Resolution' value={res} onChange={this.numCling.bind(this, 'res')} className={cx('form-control')}/>
            <input type='number' min='1' max='20' step='1' placeholder='Minimum Contrast' value={mCont} onChange={this.numCling.bind(this, 'mCont')} className={cx('form-control')}/>
            <input type='number' min='0.125' max='0.875' step='0.125' placeholder='Cell Size Threshold Coefficient' value={thresh} onChange={this.numCling.bind(this, 'thresh')} className={cx('form-control')}/>
            <input type='number' min='2' max='10' step='1' placeholder='Cell Minimum Detection Distance' value={mDist} onChange={this.numCling.bind(this, 'mDist')} className={cx('form-control')}/>
          </div>
        </div>
        <footer className={cx('py-4')}>
          Copyright &copy; 2019 Russell Steadman. Some Rights Reserved. This work is licensed under a <a rel='license' href='https://creativecommons.org/licenses/by-sa/4.0/'>Creative Commons Attribution-ShareAlike 4.0 International License</a>.
        </footer>
      </div>
    );
  }
}

export default App;
