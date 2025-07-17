declare global {
    interface Window {
      fbAsyncInit: () => void;
      FB: any;
    }
    const FB: any;
  }
  
  export {};
  