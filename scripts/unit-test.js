const { start, Test, log, formatStr } = require("./test-framework");


// TODO: Extract private members
// TODO: Create dummy environment?

/**
 * Unit test class to be used for method evaluation comparison.
 * @class
 */
global.UnitTest = class extends Test {
    constructor(purposeDescriptor, method) {
        super(purposeDescriptor, method);
    }

    call(...args) {
        return this.callReference.call(...args);    // TODO: Implement option for object property passing (retain this context)
    }

    compare(expected, actual) {
        const isObj = obj => {
            return (!!obj) && (obj.constructor === Object);
        };
    
        if(!isObj(expected) && !Array.isArray(expected)) {
            return (expected === actual)
            ? Test.Equality.FULL
            : (expected == actual)
                ? Test.Equality.HALF
                : Test.Equality.NONE;
        }
        
        const arrayCheck = (arr1, arr2) => {
            if(!Array.isArray(arr2)) {
                return false;
            }
    
            return (JSON.stringify(arr1.sort()) === JSON.stringify(arr2.sort()));
        };
    
        if(Array.isArray(expected)) {
            return arrayCheck(expected, actual)
            ? Test.Equality.FULL
            : Test.Equality.NONE;
        }
    
        if(!isObj(actual)) {
            return Equality.NONE;
        }
    
        const objDeepCheck = (obj1, obj2) => {
            if(!isObj(obj2)) {
                return false;
            }
            
            if(!arrayCheck(Object.keys(obj1), Object.keys(obj2))) {
                return false;
            }
    
            for(const key in obj1) {
                if((isObj(obj1[key]) && !objDeepCheck(obj1[key], obj2[key]))
                || (Array.isArray(obj1[key]) && !arrayCheck(obj1[key], obj2[key]))
                || obj1[key] !== obj2[key]) {
                    return false;
                }
            }
    
            return true;
        };
        
        return objDeepCheck(expected, actual)
        ? Test.Equality.FULL
        : Test.Equality.NONE;
    }
}


log(formatStr(" UNIT TEST SUITE ", null, [253, 202, 64], 1));

start();