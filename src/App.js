import React, { Component } from 'react';
import YeastDemo from './yeast.jpg';
import { SerializeImage, CreateCanvas } from './shared/Utils';
import UtilWorker from './shared/Util.worker.js';
import Classy from './shared/Classy';
import { Microscope } from './shared/Icons';
import Facts from './shared/Facts';

const cx = Classy([]);

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      /* Points */
      points: [[0, 0], [0, 0], [0, 0], [0, 0]],
      pointStep: 0,
      /* Config variables */
      wall: 0.06,
      res: 10,
      mCont: 3,
      thresh: 0.5,
      mDist: 3,
      /* Part completion */
      percent: 0,
      error: false,
      /* Count */
      count: 0,
      /* Processing step */
      step: 1,
      /* Fun facts */
      factOne: Facts[Math.ceil(Math.random() * Facts.length) - 1],
      factTwo: Facts[Math.ceil(Math.random() * Facts.length) - 1]
    };

    // Set up web worker
    if (typeof(Worker) !== 'undefined') {
      this.worker = UtilWorker();
      this.worker.onmessage = this.workerHandler;
    }
  }

  /* Handle worker messages */
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
      this.setState({
        step: 5
      });
    } else if (data.action === 'counted') {
      CreateCanvas(data.pass, this._canvas);
      this.setState({
        count: data.pass.count,
        step: 7
      });
    } else if (data.action === 'status') {
      if (data.pass.error) return this.setState({error: true});
      if (data.pass.percent > this.state.percent + 0.01) this.setState({percent: data.pass.percent});
    }
  };

  /* Respond to clicks on the canvas to rectangulate the channel */
  canvasClick = ({clientX, clientY}) => {
    let { points, pointStep, step } = this.state;
    if (step !== 2) return;
    points = points.slice();

    let {x, y, left, top} = this._canvas.getBoundingClientRect();

    if (!x && left) x = left;
    if (!y && top) y = top;
    x = Math.round(clientX - x);
    y = Math.round(clientY - y);

    points[pointStep] = [x, y];

    pointStep++;
    if (pointStep === 4) pointStep = 0;

    this.setState({
      points,
      pointStep
    }, () => {
      if (pointStep === 0) this.worker.postMessage({action: 'rectangulate', pass: points});
    });
  };

  /* Detect high contrast in the image */
  detectImage = () => {
    this.setState({
      step: 4,
      percent: 0
    }, () => {
      this.worker.postMessage({action: 'detect', pass: this.state.points.slice()});
    });
  };

  /* Redo the rectangulation */
  recopyImage = () => {
    this.worker.postMessage({action: 'copy', pass: null});
    this.setState({step: 2});
  };

  /* Count the cells */
  countImage = () => {
    this.setState({step: 6}, () => {
      this.worker.postMessage({action: 'count', pass: this.state.points.slice()});
    });
  };

  /* Update the web worker config with the state */
  updateConfig = () => {
    let { wall, res, mDist, mCont, thresh } = this.state;
    this.worker.postMessage({action: 'config', pass: {
      wall,
      res,
      mDist,
      mCont,
      thresh
    }});
  };

  /* Statefully update worker configuration variables */
  numCling(name, ev) {
    this.setState({
      [name]: ev.target.value === '' ? '' : Number(ev.target.value)
    }, () => {
      this.updateConfig();
    });
  }

  /* Handle files through explicit selection */
  fileChange = async (ev) => {
    if (ev.target.files && ev.target.files[0]) {
      let data = await SerializeImage(URL.createObjectURL(ev.target.files[0]));
      this.worker.postMessage({action: 'serialize', pass: data});
    }
  };

  /* Handle files through drag & drop */
  fileDrop = async (ev) => {
    ev.preventDefault();
    if (this.state.step !== 1) return false;
    if (ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0]) {
      let data = await SerializeImage(URL.createObjectURL(ev.dataTransfer.files[0]));
      this.worker.postMessage({action: 'serialize', pass: data});
    }
    return false;
  };

  /* Disable some events (necessary for drag & drop) */
  noEvent = (ev) => {
    ev.preventDefault();
    return false;
  };

  render() {
    let { wall, res, mCont, mDist, thresh, step, percent, count, factOne, factTwo } = this.state;

    return (
      <div className={cx('container')} onDrop={this.fileDrop} onDragEnter={this.noEvent} onDragOver={this.noEvent}>
        <header className={cx('py-3')}>
          <h1 className={cx('mb-1')}>Scan Cell</h1>
          <div className={cx('small', 'muted')}><i>Yeast Counter for FEH Nano</i></div>
        </header>
        <div>
          <div className={cx('ycanvas', {hide: step === 1 || step === 4 || step === 6})}>
            <canvas ref={(ref) => this._canvas = ref} onClick={this.canvasClick}></canvas>
          </div>

          {step === 1 ? (<div>
            <p>Upload a photo for processing. Photos have highest accuracy when they are landscape, and when HDR (high dynamic range) enabled.</p>

            <button className={cx('btn', 'btn-dark', 'btn-block', 'btn-lg')} onClick={() => this._file.click()}>
              Select Photo
            </button>

            <div className={cx('dragdrop', 'my-2', 'd-flex', 'justify-content-center', 'align-items-center')}>
              <div>
                <div className={cx('or')}>OR</div>
                <div className={cx('text')}>Drag &amp; Drop File</div>
              </div>
            </div>

            <input type='file' className={cx('hide')} ref={(ref) => this._file = ref} onChange={this.fileChange}/>

            <p>To test the tool, <a href={YeastDemo} download='yeast-demo.jpg'>download a demo image</a>.</p>
          </div>) : null}

          {step === 2 ? (<div>
            <p>Click on the <b>inner corners</b> of the channel in the following order: <b>bottom left</b> &#x2199;, <b>top left</b> &#x2196;, <b>top right</b> &#x2197;, and <b>bottom right</b> &#x2198;.</p>

            <button className={cx('btn', 'btn-dark', 'btn-block')} onClick={() => this.setState({step: 1, pointStep: 0})}>Change Image</button>
          </div>) : null}

          {step === 3 ? (<div>
            <p>Does this area look correct?</p>

            <div className={cx('btn-group', 'w-100')}>
              <button className={cx('btn', 'btn-light', 'w-100')} onClick={this.recopyImage}>No</button>
              <button className={cx('btn', 'btn-dark', 'w-100')} onClick={this.detectImage}>Yes</button>
            </div>
          </div>) : null}

          {step === 4 ? (<div>
            <div className={cx('text-center', 'micro')}>
              <Microscope/>
            </div>

            <h3 className={cx('my-3', 'text-center')}>Processing...</h3>

            <div className={cx('progress')}>
              <div className={cx('progress-bar', 'bg-royal')} role='progressbar' aria-valuenow={Math.round(percent * 100)}
              aria-valuemin='0' aria-valuemax='100' style={{width: (percent * 100) + '%'}}>
                <span className={cx('sr-only')}>{Math.round(percent * 100)}% Complete</span>
              </div>
            </div>

            <div className={cx('alert', 'alert-info', 'my-3')}>
              <b>Did you know?</b> {factOne}
            </div>
          </div>) : null}

          {step === 5 ? (<div>
            <p>Do the red spots cover the majority of the yeast cells? If they don't, modify the variables below and recalculate. Otherwise, continue.</p>

            <div className={cx('btn-group', 'w-100')}>
              <button className={cx('btn', 'btn-light', 'w-100')} onClick={this.detectImage}>Recalculate</button>
              <button className={cx('btn', 'btn-dark', 'w-100')} onClick={this.countImage}>Continue</button>
            </div>

            <h4 className={cx('mt-3', 'pb-0')}>Variables</h4>
            <hr/>

            <h5 htmlFor='wall'>Wall Distance Coefficient</h5>
            <input id='wall' type='number' min='0.01' max='0.15' step='0.005' placeholder='Wall Distance Coefficient' value={wall} onChange={this.numCling.bind(this, 'wall')} className={cx('form-control')}/>
            <ul>
              <li>This number should be a fraction between 0.01 and 0.15.</li>
              <li><b>Increase</b> this number if there is excess red near the walls.</li>
              <li><b>Decrease</b> this number if cells near the wall are not detected.</li>
            </ul>

            <h5 htmlFor='res'>Local Contrast Resolution</h5>
            <input id='res' type='number' min='3' max='50' step='1' placeholder='Local Contrast Resolution' value={res} onChange={this.numCling.bind(this, 'res')} className={cx('form-control')}/>
            <ul>
              <li>This number should be a whole number between 3 and 50.</li>
              <li><b>Increase</b> this number if yeast cells are not being detected or there is a lot of noise.</li>
              <li><b>Modify</b> this number to find what performs the best. The default is heuristic.</li>
            </ul>

            <h5 htmlFor='res'>Minimum Contrast</h5>
            <input type='number' min='1' max='20' step='1' placeholder='Minimum Contrast' value={mCont} onChange={this.numCling.bind(this, 'mCont')} className={cx('form-control')}/>
            <ul>
              <li>This number should be a whole number between 1 and 20.</li>
              <li><b>Increase</b> this number if non-cells are being detected or there is a lot of noise.</li>
              <li><b>Decrease</b> this number if yeast cells are not being detected.</li>
            </ul>
          </div>) : null}

          {step === 6 ? (<div>
            <div className={cx('text-center', 'micro')}>
              <Microscope/>
            </div>

            <h3 className={cx('my-3', 'text-center')}>Processing...</h3>

            <div className={cx('alert', 'alert-info')}>
              <b>Did you know?</b> {factTwo}
            </div>
          </div>) : null}

          {step === 7 ? (<div>
            <h3 className={cx('my-2', 'text-center')}>Cells: {count}</h3>

            <p>Do the dots cover the majority of the yeast cells? If they don't, modify the variables below and recalculate. Otherwise, the cell count is {count}.</p>

            <div className={cx('btn-group', 'w-100')}>
              <button className={cx('btn', 'btn-light', 'w-100')} onClick={this.countImage}>Recount</button>
              <button className={cx('btn', 'btn-dark', 'w-100')} onClick={() => this.setState({step: 1, pointStep: 0})}>New Image</button>
            </div>

            <h4 className={cx('mt-3', 'pb-0')}>Variables</h4>
            <hr/>

            <h5 htmlFor='mDist'>Cell Minimum Detection Distance</h5>
            <input id='mDist' type='number' min='2' max='10' step='1' placeholder='Cell Minimum Detection Distance' value={mDist} onChange={this.numCling.bind(this, 'mDist')} className={cx('form-control')}/>
            <ul>
              <li>This number should be a whole number between 2 and 10.</li>
              <li><b>Increase</b> this number if one yeast cell is being counted as many.</li>
              <li><b>Decrease</b> this number if multiple yeast cells are being counted as one.</li>
            </ul>

            <h5 htmlFor='thresh'>Cell Size Threshold Coefficient</h5>
            <input id='thresh' type='number' min='0.125' max='0.875' step='0.125' placeholder='Cell Size Threshold Coefficient' value={thresh} onChange={this.numCling.bind(this, 'thresh')} className={cx('form-control')}/>
            <ul>
              <li>This number should be a whole number between 0.125 and 0.875.</li>
              <li>Try changing the cell minimum detection distance before changing this variable.</li>
              <li><b>Increase</b> this number if one yeast cell is being counted as many.</li>
              <li><b>Decrease</b> this number if multiple yeast cells are being counted as one.</li>
            </ul>
          </div>) : null}
        </div>
        <footer className={cx('py-2')}>
          <hr/>
          <div className={cx('text-center')}><a href='https://github.com/teamtofu/scancell' target='_blank' rel='noopener noreferrer'>GitHub</a> &middot; <a href={'https://github.com/teamtofu/scancell/issues/new?assignees=teamtofu&labels=bug%2C+unresolved&template=bug_report.md&title='} target='_blank' rel='noopener noreferrer'>Report an Issue</a></div>
          <div className={cx('pt-2', 'pb-3')}>Copyright &copy; 2019 <a href={'https://www.russellsteadman.com/?utm_source=scancell&utm_medium=copyright'} target='_blank' rel='noopener noreferrer'>Russell Steadman</a>. Some Rights Reserved. This work is licensed under a <a href='https://creativecommons.org/licenses/by-sa/4.0/' target='_blank' rel='license noopener noreferrer'>Creative Commons Attribution-ShareAlike 4.0 International License</a>.</div>
        </footer>
      </div>
    );
  }
}

export default App;
