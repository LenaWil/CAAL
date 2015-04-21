/// <reference path="ccs.ts" />

module TCCS {
    
    export interface TCCSProcessDispatchHandler<T> extends CCS.ProcessDispatchHandler<T> {
        dispatchDelayPrefixProcess(process : DelayPrefixProcess, ... args) : T;
    }

    export class DelayPrefixProcess implements CCS.Process {
        constructor(public id : CCS.ProcessId, public delay : Delay, public nextProcess : CCS.Process) {
        }
        dispatchOn<T>(dispatcher : TCCSProcessDispatchHandler<T>) : T {
            return dispatcher.dispatchDelayPrefixProcess(this);
        }
        toString() {
            return "Delay(" + this.delay.toString() + ")";
        }
    }
    
    export class Delay {
        private delay : number;
        
        constructor(delay : number) {
            this.delay = delay;
        }
        
        public getDelay() : number {
            return this.delay;
        }
        
        public toString() {
            return this.delay.toString();
        }
    }
    
    export class TCCSGraph extends CCS.Graph {
        constructor() {
            super();
            this.unguardedRecursionChecker = new Traverse.TCCSUnguardedRecursionChecker();
        }
        
        private newDelayPrefixProcess(delay : Delay, nextProcess : CCS.Process) {
            var key = "." + delay.getDelay() + "." + nextProcess.id;
            var existing = this.structural[key];
            if (!existing) {
                existing = this.structural[key] = new DelayPrefixProcess(this.nextId++, delay, nextProcess);
                this.processes[existing.id] = existing;
            }
            return existing;
        }
        
        public newDelayPrefixProcesses(delays : Delay[], nextProcess : CCS.Process) {
            var next = nextProcess;
            for (var i = 0; i < delays.length; i++) {
                next = this.newDelayPrefixProcess(delays[i], next);
            }
            return this.processes[this.nextId-1];
        }
    }
}

module Traverse {
    export class TCCSLabelledBracketNotation extends Traverse.LabelledBracketNotation implements CCS.ProcessVisitor<string>, TCCS.TCCSProcessDispatchHandler<void> {
        public dispatchDelayPrefixProcess(process : TCCS.DelayPrefixProcess) {
            this.stringPieces.push("[DelayPrefix");
            this.stringPieces.push(process.delay + ".");
            process.nextProcess.dispatchOn(this);
            this.stringPieces.push("]");
        }
    }
    
    export class TCCSNotationVisitor extends Traverse.CCSNotationVisitor implements CCS.ProcessVisitor<string>, TCCS.TCCSProcessDispatchHandler<string> {
        public dispatchDelayPrefixProcess(process : TCCS.DelayPrefixProcess) {
            var result = this.cache[process.id],
                subStr;
            if (!result) {
                subStr = process.nextProcess.dispatchOn(this);
                subStr = wrapIfInstanceOf(subStr, process.nextProcess, [CCS.SummationProcess, CCS.CompositionProcess]);
                result = this.cache[process.id] = process.delay.toString() + "." + subStr;
            }
            return result;
        }
    }
}