"use strict";

let cell = 4;
// unit byte
// this global value should match the following interface

let memory = {};

memory.size = 64 * 1024 * 1024;
memory.array_buffer = new ArrayBuffer(memory.size);
memory.dataview = new DataView(memory.array_buffer);
memory.current_free_address = 0;

memory.get =
    function (index) {
        return memory.dataview.getUint32(index);
    };
memory.set =
    function (index, value) {
        memory.dataview.setUint32(index, value);
    };
memory.get_byte =
    function (index) {
        return memory.dataview.getUint8(index);
    };
memory.set_byte =
    function (index, value) {
        memory.dataview.setUint8(index, value);
    };
memory.allocate =
    function (size) {
        let return_address = memory.current_free_address;
        memory.current_free_address = return_address + size;
        return return_address;
    };

// memory.set(1, 231);
// memory.get(1);
// memory.allocate(16);
// memory.current_free_address;

memory.allocate(1024);
// 1k safe underflow

let argument_stack = {};
argument_stack.address = memory.allocate(1 * 1024 * 1024);
argument_stack.current_free_address = argument_stack.address;

argument_stack.push =
    function (value) {
        memory.set(argument_stack.current_free_address, value);
        argument_stack.current_free_address =
            argument_stack.current_free_address + cell;
    };

argument_stack.pop =
    function () {
        argument_stack.current_free_address =
            argument_stack.current_free_address - cell;
        return memory.get(argument_stack.current_free_address);
    };

argument_stack.tos =
    function () {
        return memory.get(argument_stack.current_free_address - cell);
    };

memory.allocate(1024);
// 1k safe underflow

let return_stack = {};
return_stack.address = memory.allocate(1 * 1024 * 1024);
return_stack.current_free_address = return_stack.address;

return_stack.push =
    function (value) {
        memory.set(return_stack.current_free_address, value);
        return_stack.current_free_address =
            return_stack.current_free_address + cell;
    };

return_stack.pop =
    function () {
        return_stack.current_free_address =
            return_stack.current_free_address - cell;
        return memory.get(return_stack.current_free_address);
    };

return_stack.tos =
    function () {
        return memory.get(return_stack.current_free_address - cell);
    };

let primitive_function_record = {};

// primitive_function_record.size = 4 * 1024;
// primitive_function_record.map = new Array(primitive_function_record.size);

primitive_function_record.counter = 0;
primitive_function_record.map = new Map();

primitive_function_record.get =
    function (index) {
        return primitive_function_record.map.get(index);
    };

primitive_function_record.set =
    function (index, fun) {
        return primitive_function_record.map.set(index, fun);
    };

let create_primitive_function =
    function (fun) {
        let return_address = primitive_function_record.counter;
        primitive_function_record
            .set(primitive_function_record.counter, fun);
        primitive_function_record.counter =
            primitive_function_record.counter + 1;
        return return_address;
    };

var next_explainer_argument = 0;

let next =
    function () {
        let jojo = return_stack.pop();
        let next_jojo = jojo + cell;
        let explainer = memory.get(memory.get(jojo));
        return_stack.push(next_jojo);
        next_explainer_argument = memory.get(jojo) + cell;
        primitive_function_record.get(explainer).call();
    };

function codepoint_to_utf8_byte_array(charcode){
    let array = [];

    if (charcode < 0b10000000) {
        // 0xxxxxxx
        array.unshift(charcode);
        return array;
    }

    array.unshift(0b10000000 | (charcode & 0b00111111));
    charcode = charcode >>> 6;

    if (charcode < 0b00100000) {
        // 110xxxxx 10xxxxxx
        array.unshift(0b11000000 | charcode);
        return array;
    }

    array.unshift(0b10000000 | (charcode & 0b00111111));
    charcode = charcode >>> 6;

    if (charcode < 0b00010000) {
        // 1110xxxx 10xxxxxx 10xxxxxx
        array.unshift(0b11100000 | charcode);
        return array;
    }

    array.unshift(0b10000000 | (charcode & 0b00111111));
    charcode = charcode >>> 6;

    if (charcode < 0b00001000) {
        // 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
        array.unshift(0b11110000 | charcode);
        return array;
    }

    array.unshift(0b10000000 | (charcode & 0b00111111));
    charcode = charcode >>> 6;

    if (charcode < 0b00000100) {
        // 111110xx 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx
        array.unshift(0b11111000 | charcode);
        return array;
    }

    array.unshift(0b10000000 | (charcode & 0b00111111));
    charcode = charcode >>> 6;

    {// else
        // 1111110x 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx
        array.unshift(0b11111100 | charcode);
        return array;
    }

}

// https://en.wikipedia.org/wiki/UTF-8
// codepoint_to_utf8_byte_array("€".codePointAt(0));
// [0b11100010, 0b10000010, 0b10101100]
// codepoint_to_utf8_byte_array("謝宇恆".codePointAt(0));
// codepoint_to_utf8_byte_array("謝宇恆".codePointAt(1));
// codepoint_to_utf8_byte_array("謝宇恆".codePointAt(2));

let string_area = {};

string_area.address = memory.allocate(256 * 1024);
string_area.current_free_address = string_area.address;

function create_string(string){
    let return_address = string_area.current_free_address;
    let length = string.length;
    let index = 0;

    let set_byte = function (byte){
        memory.set_byte(
            string_area.current_free_address + index,
            byte);
        string_area.current_free_address
            = string_area.current_free_address + 1;
    };

    for (index = 0; index < length; index++){
        codepoint_to_utf8_byte_array(string.codePointAt(index))
            .forEach(set_byte);
    };
    return return_address;
}

// create_string("謝宇恆");

let in_host_tag_hash_table = new Map();

let data =
    function (value) {
        memory.set(memory.current_free_address, value);
        memory.current_free_address =
            memory.current_free_address + cell;
    };

let mark =
    function (tag_string) {
        in_host_tag_hash_table
            .set(tag_string, memory.current_free_address);
    };

let link = 0;

let primitive_function_explainer =
    create_primitive_function(
        function () {
            primitive_function_record.get(
                memory.get(next_explainer_argument)
            ).call();
        });

let define_primitive_function =
    function (tag_string, fun) {
        let tag_string_address = create_string(tag_string);
        let function_index = create_primitive_function(fun);
        data(link);
        link = memory.current_free_address - cell;
        data(tag_string_address);
        mark(tag_string);
        data(primitive_function_explainer);
        data(function_index);
    };

let function_explainer =
    create_primitive_function(
        function () {
            return_stack.push(next_explainer_argument);
            next();
        });

let define_function =
    function (tag_string, function_tag_string_array) {
        let tag_string_address = create_string(tag_string);
        data(link);
        link = memory.current_free_address - cell;
        data(tag_string_address);
        mark(tag_string);
        data(function_explainer);
        function_tag_string_array.forEach(
            function (function_tag_string) {
                data(in_host_tag_hash_table.get(function_tag_string));
            }
        );
    };

let variable_explainer =
    create_primitive_function(
        function () {
            argument_stack.push(
                (memory.get(next_explainer_argument)));
            next();
        });

let define_variable =
    function (tag_string, value) {
        let tag_string_address = create_string(tag_string);
        data(link);
        link = memory.current_free_address - cell;
        data(tag_string_address);
        mark(tag_string);
        data(variable_explainer);
        data(value);
    };

define_primitive_function(
    "end",
    function () {
        return_stack.pop();
        next();
    }
);

define_primitive_function(
    "print-tos",
    function () {
        console.log(argument_stack.pop());
        next();
    }
);

define_variable("*little-test-number*", 233);

define_primitive_function(
    "bye",
    function () {
        console.log("bye bye ^-^/");
    }
);

define_function(
    "little-test",
    [ "*little-test-number*",
      "print-tos",
      "bye"
    ]
);

define_function(
    "little-test:help",
    [ "little-test",
      "end"
    ]
);

let jojo_for_little_test =
    in_host_tag_hash_table.get("little-test:help")
    + cell;

let begin_to_interpret_threaded_code =
    function () {
        return_stack.push(jojo_for_little_test);
        next();
    };

begin_to_interpret_threaded_code();

exports.begin_to_interpret_threaded_code
  = begin_to_interpret_threaded_code;
