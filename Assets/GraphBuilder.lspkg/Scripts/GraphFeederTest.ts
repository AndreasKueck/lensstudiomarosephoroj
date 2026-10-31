import { GraphBuilder, UpdateMethod } from "./GraphBuilder";

@component
export class GraphFeederTest extends BaseScriptComponent {
    
    @input
    graphBuilder: GraphBuilder;

    @input
    @widget(
        new ComboBoxWidget([
            new ComboBoxItem('Framerate', 0),
            new ComboBoxItem('Regular random data ', 1),
            new ComboBoxItem('Cosinus', 2),
        ])
      )
    mode: number;

    // Referenz zum Text-Objekt
    @input
    eligoTeksto: Text;

    onAwake() {
        switch(this.mode) {
            case 0:
                this.createEvent("UpdateEvent").bind(this.displayFPSValues.bind(this));
                break;
            case 1:
                this.pushRandomValues(4);
                break;
            case 2:
                this.createEvent("UpdateEvent").bind(this.displayCosinusValues.bind(this));
                break;
        }
    }

    displayFPSValues() {
        let deltaTime = getDeltaTime();
        if(deltaTime <= 0 )
            return;

        let fps = 1/getDeltaTime();
        this.graphBuilder.pushNewValue(fps);
    }

    displayCosinusValues() {
        this.graphBuilder.pushNewValue(Math.cos(getTime()));
    }

    pushRandomValues(delay: number) {
        let arr: number[] = [];
        
        // Textinhalt aus dem Text-Objekt lesen
        if (this.eligoTeksto && this.eligoTeksto.text) {
            const textContent = this.eligoTeksto.text;
            
            // Text in einzelne Werte aufteilen (angenommen: durch Leerzeichen, Kommas oder andere Trennzeichen getrennt)
            const values = textContent.split(/[\s,;]+/).filter(val => val.trim() !== '');
            
            // Ersten 7 Werte in Zahlen umwandeln
            for (let i = 0; i < Math.min(7, values.length); i++) {
                const num = parseFloat(values[i]);
                if (!isNaN(num)) {
                    arr[i] = num;
                } else {
                    // Fallback-Wert falls Konvertierung fehlschlägt
                    arr[i] = 0;
                }
            }
            
            // Sicherstellen, dass immer 7 Werte vorhanden sind
            while (arr.length < 7) {
                arr.push(0);
            }
        } else {
            // Fallback: ursprüngliche Werte falls Text-Objekt nicht verfügbar
            arr = [0.200, 0.900, 0.400, 0.200, 0.400, 0.700, 0.300];
        }

        this.graphBuilder.pushNewValues(arr);
        this.graphBuilder.rebuild();

        // Restart the method after a delay 
        let evt = this.createEvent("DelayedCallbackEvent");
        evt.bind(() => {
            this.pushRandomValues(delay);   
        });
        evt.reset(delay);
    }

/*
    pushRandomValues(delay: number) {
        let arr : number[] = [];
        let sampling = this.graphBuilder.sampling;
        for (let i = 0; i < sampling; i++) {
            let v = Math.random() * (this.graphBuilder.upperBound - this.graphBuilder.lowerBound) + this.graphBuilder.lowerBound;
            arr.push(Math.random() * v);
        }
        this.graphBuilder.pushNewValues(arr);
        this.graphBuilder.rebuild();

        // Restart the method after a delay 
        let evt = this.createEvent("DelayedCallbackEvent");
        evt.bind(() => {
            this.pushRandomValues(delay);   
        });
        evt.reset(delay);
    }
*/
}
