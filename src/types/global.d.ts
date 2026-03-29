export {}

type ChromeApi = typeof chrome

declare global {
  var browser: ChromeApi | undefined

  interface Window {
    browser?: ChromeApi
  }
}

declare module '*.css?inline' {
  const content: string
  export default content
}
