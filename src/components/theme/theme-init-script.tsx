export function ThemeInitScript() {
  // Runs before hydration to avoid flash.
  const code = `(function(){try{var k='infield.theme';var p=localStorage.getItem(k);if(p!=='light'&&p!=='dark'&&p!=='system'){p='system'};var d=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var r=(p==='system')?(d?'dark':'light'):p;var cl=document.documentElement.classList; if(r==='dark'){cl.add('dark');document.documentElement.style.colorScheme='dark';}else{cl.remove('dark');document.documentElement.style.colorScheme='light';}document.documentElement.dataset.theme=p;}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}


