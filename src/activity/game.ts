/// <reference path="../../lib/d3.d.ts" />
/// <reference path="../gui/project.ts" />
/// <reference path="activity.ts" />

module Activity {

    import dg = DependencyGraph;

    export class Game extends Activity {
        private project : Project;
        private graph : CCS.Graph;
        private succGen : CCS.SuccessorGenerator;
        private $gameType : JQuery;
        private $leftProcessList : JQuery;
        private $rightProcessList : JQuery;
        private leftSvg : D3.Selection;
        private rightSvg : D3.Selection;

        constructor(container : string, button : string) {
            super(container, button);

            this.project = Project.getInstance();

            this.$gameType = $("#game-type");
            this.$leftProcessList = $("#game-left-process");
            this.$rightProcessList = $("#game-right-process");

            this.$gameType.add(this.$leftProcessList).add(this.$rightProcessList).on("change", () => this.newGame());

            this.leftSvg = d3.select("#game-left-svg").append("svg")
                .attr("width", "100%");
            this.rightSvg = d3.select("#game-right-svg").append("svg")
                .attr("width", "100%");
        }

        public onShow(configuration? : any) : void {
            $(window).on("resize", () => this.resize());
            this.resize();

            if (this.project.getChanged()) {
                this.graph = this.project.getGraph();
                this.displayOptions();
                this.newGame();
            }
        }

        public onHide() : void {
            $(window).off("resize");
        }

        private displayOptions() : void {
            var processes = this.graph.getNamedProcesses().reverse();
            
            this.$leftProcessList.empty();
            this.$rightProcessList.empty();

            for (var i = 0; i < processes.length; i++) {
                this.$leftProcessList.append($("<option></option>").append(processes[i]));
                this.$rightProcessList.append($("<option></option>").append(processes[i]));
            }

            // Set second option as default selection for the right process.
            this.$rightProcessList.find("option:nth-child(2)").prop("selected", true);
        }

        private getOptions() : any {           
            return {
                gameType: this.$gameType.val(),
                leftProcess: this.$leftProcessList.val(),
                rightProcess: this.$rightProcessList.val()
            };
        }

        private newGame() : void {
            var options = this.getOptions();
            this.succGen = CCS.getSuccGenerator(this.graph, {succGen: options.gameType, reduce: false});
            this.draw(this.leftSvg);
        }

        private draw(svg : D3.Selection) : void {
            var graph = this.getGraph(this.graph.processByName("A"));

            var force = d3.layout.force()
                .nodes(graph.nodes)
                .links(graph.links)
                .size([parseInt(svg.attr("width")), parseInt(svg.attr("height"))]);

            force.start();
            for (var i = 100; i > 0; --i) force.tick();
            force.stop();

            svg.selectAll("circle")
                .data(graph.nodes)
                .enter().append("circle")
                .attr("cx", function(d) { return d.x; })
                .attr("cy", function(d) { return d.y; })
                .attr("r", 4.5);

            svg.selectAll("line")
                .data(graph.links)
                .enter().append("line")
                .attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });
        }

        private getNodes() : any[] {
            return this.graph.getNamedProcesses().map(function(p) {return {name: p}});
        }

        private getGraph(start : CCS.Process) : any {
            var nodes = [],
                links = [],
                waiting = [start],
                done = [],
                source;

            for (var i = 0; i < waiting.length; i++) {
                source = waiting[i];
                done.push(source.id);

                this.succGen.getSuccessors(source.id).forEach(t => {
                    if (done.indexOf(t.targetProcess.id) === -1) {
                        waiting.push(t.targetProcess);
                    }

                    nodes[source.id] = {id: source.id, name: source.name};
                    links.push({source: source.id, target: t.targetProcess.id});
                });
            }

            return {nodes: nodes, links: links};
        }

        private resize() : void {
            var offsetTop = $("#game-main").offset().top;
            var offsetBottom = $("#game-log").height();

            // Height = Total - (menu + options) - log - (margin + border).
            // Minimum size 275 px.
            var height = Math.max(275, window.innerHeight - offsetTop - offsetBottom - 41);

            this.leftSvg.attr("height", height);
            this.rightSvg.attr("height", height);
        }
    }
    
    enum PlayType { Attacker, Defender }
    enum Move { Right, Left }

    class Game2 {
        
        protected dependencyGraph : dg.DependencyGraph;
        protected marking : any;
        
        private htmlNotationVisitor : Traverse.TooltipHtmlCCSNotationVisitor;
        private gameLog : GameLog = new GameLog();
        
        protected attacker : Player;
        protected defender : Player;
        private round : number = 1;
        private step : number = 0;
        
        protected lastMove : Move;
        protected lastAction : string;
        protected currentNodeId : any; // TODO
        
        constructor(protected graph : CCS.Graph, attackerSuccessorGen : CCS.SuccessorGenerator, defenderSuccesorGen : CCS.SuccessorGenerator) {
            // set start node
            this.currentNodeId = 0;
            
            // create the dependency graph
            this.dependencyGraph = this.createDependencyGraph(this.graph, attackerSuccessorGen, defenderSuccesorGen);
            
            // create markings
            this.marking = this.createMarking();
        }
        
        public getRound() : number {
            return this.round;
        }
        
        public getMarking(nodeId : any = undefined) : any {
            if (nodeId == undefined)
                return this.marking;
            else
                return this.marking.getMarking(nodeId);
        }
        
        public getProcessById(id : any) : any {
            return this.graph.processById(id);
        }
        
        public getConstructData(nodeId : any) : any {
            throw "Abstract method. Not implemented.";
            return undefined;
        }
        
        public getWinner() : Player {
            throw "Abstract method. Not implemented.";
            return undefined;
        }
        
        public isWinner(player : Player) : boolean {
            return this.getWinner() == player;
        }
        
        public isZero(nodeId : any) {
            return this.marking.getMarking(nodeId) === this.marking.ZERO;
        }
        
        public isOne(nodeId : any) {
            return this.marking.getMarking(nodeId) === this.marking.ONE;
        }
        
        public getLastMove() : Move {
            return this.lastMove;
        }
        
        public startGame() : void {
            if (this.attacker == undefined || this.defender == undefined)
                throw "No players in game.";
            
            this.attacker.prepareTurn();
        }
        
        public setPlayers(attacker : Player, defender : Player) {
            if (attacker.getPlayType() == defender.getPlayType()) {
                throw "Cannot make game with two " + attacker.playTypeStr() + "s";
            }
            else if (attacker.getPlayType() != PlayType.Attacker ||
                defender.getPlayType() != PlayType.Defender) {
                throw "setPlayer(...) : First argument must be attacker and second defender";
            }
            
            this.attacker = attacker;
            this.defender = defender;
        }
        
        protected createDependencyGraph(graph : CCS.Graph, attackerSuccessorGen : CCS.SuccessorGenerator, defenderSuccesorGen : CCS.SuccessorGenerator) : dg.DependencyGraph { // abstract
            throw "Abstract method. Not implemented.";
            return undefined;
        }
        
        protected createMarking() : any { // abstract
            throw "Abstract method. Not implemented.";
            return undefined;
        }
        
        public play(player : Player, destinationProcess : any, action : string = this.lastAction, move? : Move) {
            this.step++;
            
            var destinationHtml : string = this.htmlNotationVisitor.visit(destinationProcess);
            
            if (player == this.attacker) {
                this.gameLog.printRound(this.step / 2 + 1);
                this.gameLog.printPlay(player, action, destinationHtml);
                
                this.lastAction = action;
                this.lastMove = move;
                
                // tell the other player to prepare for their turn
                this.defender.prepareTurn();
            } else {
                this.gameLog.printPlay(player, action, destinationHtml);
                
                // if the play is a defense, then flip the saved last move
                this.lastMove = this.lastMove == Move.Right ? Move.Left : Move.Right;
                
                // tell the other player to prepare for their turn
                this.attacker.prepareTurn();
            }
            
            // change the current node id to the one played
            this.currentNodeId = destinationProcess.id;
        }
        
        public getHyperedges(nodeId : any) : any {
            return this.dependencyGraph.getHyperEdges(nodeId);
        }
        
        public getCurrentHyperedges() : any {
            return this.getHyperedges(this.currentNodeId);
        }
    }

    class BisimulationGame extends Game2 {
        
        private leftProcessName : string;
        private rightProcessName : string;
        private bisimulationDG : dg.BisimulationDG;
        private bisimilar : boolean;
        
        constructor(graph : CCS.Graph, attackerSuccessorGen : CCS.SuccessorGenerator, defenderSuccesorGen : CCS.SuccessorGenerator, leftProcessName : string, rightProcessName : string) {
            // stupid compiler
            this.leftProcessName = leftProcessName;
            this.rightProcessName = rightProcessName;
            
            super(graph, attackerSuccessorGen, defenderSuccesorGen); // creates dependency graph and marking
        }
        
        public isBisimilar() : boolean {
            return this.bisimilar;
        }
        
        public getConstructData(nodeId : any) : any {
            return this.bisimulationDG.constructData[nodeId];
        }
        
        protected createDependencyGraph(graph : CCS.Graph, attackerSuccessorGen : CCS.SuccessorGenerator, defenderSuccesorGen : CCS.SuccessorGenerator) : dg.DependencyGraph {
            var leftProcess : any  = graph.processByName(this.leftProcessName);
            var rightProcess : any = graph.processByName(this.rightProcessName);
            
            return this.bisimulationDG = new dg.BisimulationDG(attackerSuccessorGen, defenderSuccesorGen, leftProcess.id, rightProcess.id);
        }
        
        public getWinner() : Player {
            return this.bisimilar ? this.defender : this.attacker;
        }
        
        protected createMarking() : any {
            var marking : any;// = dg.liuSmolkaLocal2(0, this.bisimulationDG);
            this.bisimilar = marking.getMarking(0) === marking.ONE;
            return marking;
        }
    }

    class Player { // abstract
        
        static Player1Color : string = "#e74c3c";
        static Player2Color : string = "#2980b9";
        static HumanColor : string = Player.Player1Color;
        static ComputerColor : string = Player.Player2Color;
        
        constructor(protected playerColor : string, protected game: Game2, private playType : PlayType) {
            
        }
        
        public prepareTurn() : void {
            // input list of processes
            switch (this.playType)
            {
                case PlayType.Attacker: {
                    this.prepareAttack();
                    break;
                }
                case PlayType.Defender: {
                    this.prepareDefend();
                    break;
                }
            }
        }
        
        public getColor() : string {
            return this.playerColor;
        }
        
        public getPlayType() : PlayType {
            return this.playType;
        }
        
        protected prepareAttack() : void {
            throw "Abstract method. Not implemented.";
        }
        
        protected prepareDefend() : void {
            throw "Abstract method. Not implemented.";
        }
        
        public playTypeStr() : string {
            return this.playType == PlayType.Attacker ? "ATTACKER" : this.playType == PlayType.Defender ? "DEFENDER" : "UNKNOWN";
        }
    }
    
    class Human extends Player {
        
        constructor(playerColor : string, game : Game2, playType : PlayType) {
            super(playerColor, game, playType);
        }
        
        protected prepareAttack() : void {
            // clickHandler
        }
        
        protected prepareDefend() : void {
            // clickHandler
        }
    }

    class Computer extends Player {
        
        static Delay : number = 2000;
        
        constructor(playerColor : string, game: Game2, playType : PlayType) {
            super(playerColor, game, playType);
        }
        
        protected prepareAttack() : void {
            // select the best play style
            if (this.game.isWinner(this))
                setTimeout( () => this.winningAttack(), Computer.Delay);
            else
                setTimeout( () => this.losingAttack(), Computer.Delay);
        }
        
        protected prepareDefend() : void {
            // select the best play style
            if (this.game.isWinner(this))
                setTimeout( () => this.winningDefend(), Computer.Delay);
            else
                setTimeout( () => this.losingDefend(), Computer.Delay);
        }
        
        private losingAttack() : void {
            // TODO
        }
        
        private winningAttack() : void {
            var hyperedges : any = this.game.getCurrentHyperedges();
            
            var edge : any;
            var allOne : boolean = false;
            
            for (var i : number = 0; i < hyperedges.length && !allOne; i++) {
                edge = hyperedges[i];
                allOne = true;
                
                for (var j : number = 0; j < edge.length; j++) {
                    if (this.game.getMarking(edge[j]) !== this.game.isOne(edge[j])) {
                        allOne = false;
                        break;
                    }
                }
            }
            
            if (!allOne)
                throw "Computer: *cry*, cant make clever attack.";
            
            var data : any = this.game.getConstructData(edge[0]);
            var action : string = data[1].toString();
            
            var move : Move;
            var processToPlay : any;
            
            if (data[0] == 1) { // left
                move = Move.Left;
                processToPlay = this.game.getProcessById(data[2]);
            } else if (data[0] == 2) { // right
                move = Move.Right;
                processToPlay = this.game.getProcessById(data[3]);
            }
            
            this.game.play(this, processToPlay, action, move);
        }
        
        private losingDefend() : void {
            // TODO
        }
        
        private winningDefend() : void {
            var hyperedges : any = this.game.getCurrentHyperedges();
            var data : any;
            
            for (var i : number = 0; i < hyperedges.length; i++) {
                var edge = hyperedges[i];
                
                for (var j : number = 0; j < edge.length; j++) {
                    if (this.game.isZero(this.game.getMarking(edge[j]))) {
                        data = this.game.getConstructData(edge[0]);
                        break;
                    }
                }
            }
                
            var processToPlay : any;
            
            if (this.game.getLastMove() == Move.Left)
                processToPlay = this.game.getProcessById(data[2]);
            else
                processToPlay = this.game.getProcessById(data[1]);
            
            this.game.play(this, processToPlay);
        }
    }

    class GameLog {
        
        private $list : any;
        
        constructor() {
            this.$list = $("#game-console").find("ul");
            this.$list.empty();
        }
        
        public print(line : string, margin : number = 0) : void {
            this.$list.append("<li style='margin-left: " + margin + "px'>" + line + "</li>");
        }
        
        public printRound(round : number) : void {
            this.print("Round " + Math.floor(round) + ":");
        }
        
        public printPlay(player : Player, action : string, destination : string) : void {
            this.print("<span style='color: "+player.getColor()+"'>" + player.playTypeStr() + "</span>: " + "--- "+action+" --->   " + destination, 20);
        }
    }
}
