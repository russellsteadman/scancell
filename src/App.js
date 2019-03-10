import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import YeastS1 from './yeast.jpg';
import { SerializeImage } from './shared/Utils';

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {};

    if (typeof(Worker) !== 'undefined') {
      this.worker = new Worker(require('url-loader!./shared/Util.worker.js'));
    }
  }

  parseImage = () => {
    SerializeImage(YeastS1);
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p>
            Edit <code>src/App.js</code> and save to reload.
          </p>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn React
          </a>
          <button onClick={this.parseImage}>Serialize</button>
        </header>
      </div>
    );
  }
}

export default App;
