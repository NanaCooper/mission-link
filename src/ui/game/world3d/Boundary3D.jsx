import { Component } from 'react';

// If anything in the 3D map breaks (it cannot load, or it throws), show the 2D map instead.
// The game never stops because of the 3D picture.
//   fallback   what to show instead (the 2D map)
//   onError    called once, so the map remembers to stay 2D
export default class Boundary3D extends Component {
  constructor(props) {
    super(props);
    this.state = { broken: false };
  }

  static getDerivedStateFromError() {
    return { broken: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    return this.state.broken ? this.props.fallback : this.props.children;
  }
}
