import React from 'react';
import ReactDOM from 'react-dom';
import Classy from './Classy';

const cx = Classy([]);
const modalRoot = document.getElementById('modal-root');

export class Portal extends React.Component {
    constructor(props) {
        super(props);

        this.el = document.createElement('div');
    }
  
    componentDidMount() {
        modalRoot.appendChild(this.el);
    }
  
    componentWillUnmount() {
        modalRoot.removeChild(this.el);
    }
  
    render() {
        return ReactDOM.createPortal(this.props.children, this.el);
    }
}

export const Modal = ({title, content, close}) => (<Portal>
    <div className={cx('modal-bg')}>
        <div className={cx('modal', 'd-block')}>
            <div className={cx('modal-dialog')}>
                <div className={cx('modal-content', 'border-0')}>
                    <div className={cx('modal-header', 'bg-royal', 'text-light')}>
                        <h5 className={cx('modal-title')}>{title}</h5>
                        <button type='button' className={cx('close', 'text-light')} aria-label='Close' onClick={close}>
                            <span aria-hidden='true'>&times;</span>
                        </button>
                    </div>
                    <div className={cx('modal-body')}>
                        {content}
                    </div>
                    <div className={cx('modal-footer', 'bg-royal', 'text-light')}>
                        <button type='button' className={cx('btn', 'btn-light')} onClick={close}>Close</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</Portal>);