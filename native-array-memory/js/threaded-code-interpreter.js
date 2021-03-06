"use strict";

let cell_area = {};

cell_area.size = 1024 * 1024;
cell_area.array = new Array(cell_area.size);
cell_area.pointer = 0;

cell_area.get =
  (index) => {
    return cell_area.array[index];
  };
cell_area.set =
  (index, value) => {
    cell_area.array[index] = value;
  };

cell_area.allocate =
  (size) => {
    let return_address = cell_area.pointer;
    cell_area.pointer = return_address + size;
    return return_address;
  };

// cell_area.set(1, 231);
// cell_area.get(1);
// cell_area.set(1, 0);
// cell_area.get(1);
// cell_area.allocate(16);
// cell_area.pointer;

let argument_stack = {};
argument_stack.array = new Array(1024);
argument_stack.pointer = 0;

argument_stack.push =
  (value) => {
    argument_stack.array[argument_stack.pointer] = value;
    argument_stack.pointer =
      argument_stack.pointer + 1;
  };

argument_stack.pop =
  () => {
    argument_stack.pointer =
      argument_stack.pointer - 1;
    return argument_stack.array[argument_stack.pointer];
  };

let return_stack = {};
return_stack.array = new Array(1024);
return_stack.pointer = 0;

return_stack.push =
  (value) => {
    return_stack.array[return_stack.pointer] = value;
    return_stack.pointer =
      return_stack.pointer + 1;
  };

return_stack.pop =
  () => {
    return_stack.pointer =
      return_stack.pointer - 1;
    return return_stack.array[return_stack.pointer];
  };

let primitive_function_record = {};

primitive_function_record.counter = 0;
primitive_function_record.map = new Map();

primitive_function_record.get =
  (index) => {
    return primitive_function_record.map.get(index);
  };

primitive_function_record.set =
  (index, fun) => {
    primitive_function_record.map.set(index, fun);
  };

let create_primitive_function =
    (fun) => {
      let return_address = primitive_function_record.counter;
      primitive_function_record
        .set(primitive_function_record.counter, fun);
      primitive_function_record.counter =
        primitive_function_record.counter + 1;
      return return_address;
    };

var address_after_explainer = 0;

let interpreter =
    () => {
      try {
        while (true) {
          let jojo = return_stack.pop();
          let jo = cell_area.get(jojo);
          let explainer = cell_area.get(jo);
          return_stack.push(jojo + 1);
          address_after_explainer = jo + 1;
          primitive_function_record.get(explainer).call();
          continue;
        }

      } catch (string) {
        switch (string) {
        case "bye":
          break;
        }
      }
    };

let in_host_tag_record = new Map();

let data =
    (value) => {
      cell_area.set(cell_area.pointer, value);
      cell_area.pointer =
        cell_area.pointer + 1;
    };

let mark =
    (tag_string) => {
      in_host_tag_record
        .set(tag_string, cell_area.pointer);
    };

let link = 0;

let define_header =
    (tag_string, explainer) => {
      data(link);
      link = cell_area.pointer - 1;
      mark(tag_string);
      data(explainer);
    };

let primitive_function_explainer =
    create_primitive_function(
      () => {
        primitive_function_record.get(
          cell_area.get(address_after_explainer)
        ).call();
      });

let define_primitive_function =
    (tag_string, fun) => {
      let function_index = create_primitive_function(fun);
      define_header(tag_string, primitive_function_explainer);
      data(function_index);
    };

let function_explainer =
    create_primitive_function(() => {
      return_stack.push(address_after_explainer);
    });

let define_function =
    (tag_string, function_tag_string_array) => {
      define_header(tag_string, function_explainer);
      function_tag_string_array.forEach(
        function_tag_string => {
          data(in_host_tag_record
               .get(function_tag_string));
        }
      );
    };

let variable_explainer =
    create_primitive_function(() => {
      argument_stack.push(
        cell_area.get(address_after_explainer));
    });

let define_variable =
    (tag_string, value) => {
      define_header(tag_string, variable_explainer);
      data(value);
    };

define_primitive_function(
  "end",
  () => {
    return_stack.pop();
  }
);

define_primitive_function(
  "bye",
  () => {
    console.log("bye bye ^-^/");
    throw "bye";
  }
);

define_primitive_function(
  "dup",
  () => {
    let a = argument_stack.pop();
    argument_stack.push(a);
    argument_stack.push(a);
  }
);

define_primitive_function(
  "mul",
  () => {
    let a = argument_stack.pop();
    let b = argument_stack.pop();
    argument_stack.push(a * b);
  }
);

define_primitive_function(
  "simple-wirte",
  () => {
    console.log(argument_stack.pop());
  }
);

define_variable("little-test-number", 4);

define_function(
  "square",
  [ "dup",
    "mul",
    "end"
  ]
);

define_function(
  "little-test",
  [ "little-test-number",
    "square",
    "simple-wirte",
    "bye"
  ]
);

define_function(
  "first-function",
  [ "little-test",
    "end"
  ]
);

let function_body_for_little_test =
    in_host_tag_record.get("first-function")
    + 1;

let begin_to_interpret_threaded_code =
    () => {
      return_stack.push(function_body_for_little_test);
      interpreter();
    };

begin_to_interpret_threaded_code();
