export enum UpdateMethod{
    UPDATE_EVENT = 0,
    DELAYED_EVENT = 1,
    MANUAL = 2,
}

export enum GraphMode {
    CURVE_GRAPH = 0,
    AREA_GRAPH = 1,
}

@component
export class GraphBuilder extends BaseScriptComponent {
    
    @ui.separator
    @ui.label("<b>Base Properties</b>")

    @input 
    curveMeshVisual: RenderMeshVisual;

    @input('int', '200')
    @hint("The number of values to be displayed in the graph")
    @widget(new SliderWidget(0, 500, 1))
    sampling: number = 200;

    @input('int', '0')
    @widget(
        new ComboBoxWidget([
            new ComboBoxItem('Update Event', 0),
            new ComboBoxItem('Delayed Event', 1),
            new ComboBoxItem('Manual', 2),
        ])
      )
    refreshMethod: UpdateMethod = UpdateMethod.UPDATE_EVENT;

    @input
    @showIf("refreshMethod",1)
    @hint("The time in seconds between each refresh")
    refreshTime: number = 0.25;

    @input('float', '1')
    upperBound: number = 1;
    @input('float', '0')
    lowerBound: number = 0;

    @ui.separator
    @ui.label("<b>Visual Properties</b>")

    @input('vec3[]')
    @label("Colors (low to high)")
    @widget(new ColorWidget())
    private colors: vec3[] = [];

    @input('int')
    @widget(
        new ComboBoxWidget([
          new ComboBoxItem('Curve', 0),
          new ComboBoxItem('Area', 1),
        ])
      )
    graphMode: GraphMode = GraphMode.CURVE_GRAPH;

    @input 
    @showIf("graphMode", 0)
    curveWidth: number = 0.02;

    @input
    clampCurveInsideGraph: boolean = true;

    @ui.group_start('Smoothing')
    @input
    @label('Enabled') 
    @hint("Enables smooth transition between values.\nSmoothing is not available with the 'Manual' refresh method for now.")
    smoothingEnabled: boolean = false;

    @input('float', '0.5') 
    @showIf("smooth")
    @label('Sharpness')
    @widget(new SliderWidget(0.01, .99, 0.01))
    smoothingSharpness: number = 0.5;
    @ui.group_end

    private values: number[];
    private getLastValue = ()=>this.values[this.getValuesNumber()-1];
    private getValuesNumber = ()=>this.values.length;

    private builder : MeshBuilder;
    private vertices: number[];

    private componentsNumber: number = 6; // 3 for position xyz, 3 for color rgb

    private curveExtent: number = this.curveWidth / 2;

    private lastTargetValue: number = 0;

    onAwake() {
        // Initialize values to 0
        this.values = [];
        for (var i = 0; i < this.sampling; i++) {
            this.values.push(this.lowerBound)
        }

        this.initializeGraph();
        
        if(this.refreshMethod == UpdateMethod.DELAYED_EVENT) {
            this.repeatRefreshValuesArray();
        }
        else if(this.refreshMethod == UpdateMethod.UPDATE_EVENT) {
            this.createEvent("UpdateEvent").bind(this.refreshValuesArray.bind(this));
        }
    }

    private initializeGraph() {
        this.builder = new MeshBuilder([
            { name: 'position', components: 3 },
            { name: 'color', components: 3 },
        ]);
        this.builder.topology = MeshTopology.TriangleStrip;
        this.builder.indexType = MeshIndexType.UInt16;
        
        this.vertices = [];

        let color = this.getColor(0);
        let valuesNumber = this.getValuesNumber();
        let needMargin = this.graphMode == GraphMode.CURVE_GRAPH;

        for (let i = 0; i < valuesNumber; i++) {
            let center : vec2 = new vec2(MathUtils.remap(i,0,valuesNumber-1,0,1),this.mapToGraphBoundaries(this.values[i]));
            let minY = MathUtils.clamp(needMargin? center.y - this.curveExtent : center.y, 0, 1);
            let maxY = MathUtils.clamp(needMargin? center.y + this.curveExtent : center.y, 0, 1);

            // xyz & rgb
            this.vertices.push(
                center.x,maxY,0,color.x,color.y,color.z,
                center.x,minY,0,color.x,color.y,color.z
            );
        }

        this.builder.appendVerticesInterleaved(this.vertices);

        let indices:number[] = [];
        for (let i = 0; i < valuesNumber; i++) {
            indices.push(2*i,2*i+1);
        }
        this.builder.appendIndices(indices);

        this.curveMeshVisual.mesh = this.builder.getMesh();
        this.builder.updateMesh();
    }

    private mapToGraphBoundaries(value:number): number {
        let mappedValue = MathUtils.remap(value, this.lowerBound, this.upperBound,0,1);
        if(this.clampCurveInsideGraph) {
            mappedValue = MathUtils.clamp(mappedValue,0,1);
        }

        return mappedValue;
    }

    private repeatRefreshValuesArray() {
        this.refreshValuesArray();
        
        let delayedEvent = this.createEvent("DelayedCallbackEvent");
        delayedEvent.bind(this.repeatRefreshValuesArray.bind(this));
        delayedEvent.reset(this.refreshTime);
    }

    private refreshValuesArray(){
        let lastValue = this.getLastValue();
        if(this.smoothingEnabled) {
            let blend = 1 - Math.pow(1 - this.smoothingSharpness, getDeltaTime() * 30);
            lastValue = MathUtils.lerp(lastValue, this.lastTargetValue, blend);
        }

        this.values.shift();
        this.values.push(lastValue);

        this.refresh();
    }

    private getColor(t:number): vec3 {
        if (t < 0) { 
            return this.colors[0];
        }

        let index: number = Math.floor((this.colors.length - 1) * t);

        let min: vec3 = this.colors[index];
        let max: vec3 = index == (this.colors.length - 1) ? this.colors[index] : this.colors[index + 1];

        let intervalSize: number = 1 / (this.colors.length - 1);
        let interval_t: number = (t - index * intervalSize) / intervalSize;

        return vec3.lerp(min, max, Math.max(0, interval_t));
    }

    /**
     * This method is meant to be called after adding a unique value to the graph. 
     * It is more optimized than calling the rebuild method, as it only updates existing vertices instead of creating new ones.
     */
    refresh() {
        let newValue = this.mapToGraphBoundaries(this.getLastValue());
        let color = this.getColor(newValue);

        let top = 0;
        let bottom = 0;

        if( this.graphMode == GraphMode.AREA_GRAPH ) {
            top = newValue;
        }
        else if( this.graphMode == GraphMode.CURVE_GRAPH ) {
            if(this.clampCurveInsideGraph) {
                top = MathUtils.clamp(newValue + this.curveExtent,0,1);
                bottom = MathUtils.clamp(newValue - this.curveExtent,0,1);
            }
            else {
                top = newValue + this.curveExtent;
                bottom = newValue - this.curveExtent;
            }
        }
        
        let newVerticesCouple: number[] = [
            1, top, 0, color.x, color.y, color.z,
            1, bottom, 0, color.x, color.y, color.z
        ];

        // Remove the first vertex couple & add the new one     
        for(let i=0;i<newVerticesCouple.length;++i) {
            this.vertices.shift();
            this.vertices.push(newVerticesCouple[i]);
        }

        // Shift every vertex couple to the left
        let vertexIndex = 0
        let valuesNumber = this.getValuesNumber();
        let shift = MathUtils.remap(1,0,valuesNumber,0,1);
        let indicesCount = this.builder.getIndicesCount();
        for(let i = 0; i < this.vertices.length; i+=(this.componentsNumber*2)) {
            let mappedX = MathUtils.remap(vertexIndex/2,0,valuesNumber-1,0,1);
            let firstVerticeEnd = i+this.componentsNumber
            
            if(vertexIndex === indicesCount - 2) {
                this.vertices[i] = mappedX;
                this.vertices[firstVerticeEnd] = mappedX;
            }
            else {
                this.vertices[i] -= shift
                this.vertices[firstVerticeEnd] -= shift
            }           
            
            this.builder.setVertexInterleaved(vertexIndex, this.vertices.slice(i, firstVerticeEnd));
            this.builder.setVertexInterleaved(vertexIndex+1, this.vertices.slice(firstVerticeEnd, firstVerticeEnd + this.componentsNumber));
            
            vertexIndex+=2;
        }
        
        this.builder.updateMesh();
    }

    /**
     * This method is meant to be called after adding multiple values to the graph using pushNewValues method. 
     * It is heavier than calling refresh method, as it creates new vertices instead of updating existing ones.
     */
    rebuild() {
        this.builder.eraseVertices(0, this.builder.getVerticesCount());
        this.vertices = [];

        for(let i = 0; i < this.values.length; i++) {
            let value = this.mapToGraphBoundaries(this.values[i]);
            let color = this.getColor(value);
            let top = 0;
            let bottom = 0;
            if( this.graphMode == GraphMode.AREA_GRAPH ) {
                top = value;
            }
            else if( this.graphMode == GraphMode.CURVE_GRAPH ) {
                if(this.clampCurveInsideGraph) {
                    top = MathUtils.clamp(value + this.curveExtent,0,1);
                    bottom = MathUtils.clamp(value - this.curveExtent,0,1);
                }
                else {
                    top = value + this.curveExtent;              
                    bottom = value - this.curveExtent;
                }
            }

            let mappedX = MathUtils.remap(i,0,this.values.length-1,0,1);
            this.vertices.push(
                mappedX,top,0,color.x,color.y,color.z,
                mappedX,bottom,0,color.x,color.y,color.z
            );
        }

        this.builder.appendVerticesInterleaved(this.vertices);
        this.builder.updateMesh();
    }

    /**
     * Push a new value to the graph.
     * @param newValue The value to be pushed to the graph.
     */
    pushNewValue(newValue: number) {

        if(this.smoothingEnabled){
            this.lastTargetValue = newValue;
        }
        else {
            this.values.shift();
            this.values.push(newValue);
        }
    }

    /**
     * Push multiple values to the graph.
     * @param newValues The values to be pushed to the graph. 
     */
    pushNewValues(newValues: number[]) {
        
        for(let i = 0; i < newValues.length; i++) {
            this.values.shift();
            this.values.push(newValues[i]);
        }

        if(this.refreshMethod != UpdateMethod.MANUAL) {
            this.rebuild();
        }
    }
}