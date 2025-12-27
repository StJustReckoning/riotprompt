export const clean = (obj: any) => {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, v]) => v !== undefined)
    );
}

//Recursive implementation of jSON.stringify;
export const stringifyJSON = function (obj: any, visited: Set<any> = new Set()): string {
    const arrOfKeyVals: string[] = [];
    const arrVals: string[] = [];
    let objKeys: string[] = [];

    /*********CHECK FOR PRIMITIVE TYPES**********/
    if (typeof obj === 'number' || typeof obj === 'boolean' || obj === null)
        return '' + obj;
    else if (typeof obj === 'string')
        return '"' + obj + '"';

    /*********DETECT CIRCULAR REFERENCES**********/
    if (obj instanceof Object && visited.has(obj)) {
        return '"(circular)"';
    }

    /*********CHECK FOR ARRAY**********/
    else if (Array.isArray(obj)) {
        //check for empty array
        if (obj.length === 0)
            return '[]';
        else {
            // Add array to visited before processing its elements
            visited.add(obj);
            obj.forEach(function (el) {
                arrVals.push(stringifyJSON(el, visited));
            });
            return '[' + arrVals + ']';
        }
    }
    /*********CHECK FOR OBJECT**********/
    else if (obj instanceof Object) {
        // Add object to visited before processing its properties
        visited.add(obj);
        //get object keys
        objKeys = Object.keys(obj);
        //set key output;
        objKeys.forEach(function (key) {
            const keyOut = '"' + key + '":';
            const keyValOut = obj[key];
            //skip functions and undefined properties
            if (keyValOut instanceof Function || keyValOut === undefined)
                return; // Skip this entry entirely instead of pushing an empty string
            else if (typeof keyValOut === 'string')
                arrOfKeyVals.push(keyOut + '"' + keyValOut + '"');
            else if (typeof keyValOut === 'boolean' || typeof keyValOut === 'number' || keyValOut === null)
                arrOfKeyVals.push(keyOut + keyValOut);
            //check for nested objects, call recursively until no more objects
            else if (keyValOut instanceof Object) {
                arrOfKeyVals.push(keyOut + stringifyJSON(keyValOut, visited));
            }
        });
        return '{' + arrOfKeyVals + '}';
    }
    return '';
};
