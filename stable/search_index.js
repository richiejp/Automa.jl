var documenterSearchIndex = {"docs": [

{
    "location": "index.html#",
    "page": "Home",
    "title": "Home",
    "category": "page",
    "text": ""
},

{
    "location": "index.html#Home-1",
    "page": "Home",
    "title": "Home",
    "category": "section",
    "text": "Automa.jl is a package for generating finite-state machines (FSMs) and tokenizers in Julia.The following code is an example of tokenizing various kinds of numeric literals in Julia.import Automa\nimport Automa.RegExp: @re_str\nconst re = Automa.RegExp\n\n# Describe regular expression patterns.\ndec      = re\"[-+]?[0-9]+\"\nhex      = re\"0x[0-9A-Fa-f]+\"\noct      = re\"0o[0-7]+\"\nprefloat = re\"[-+]?([0-9]+\\.[0-9]*|[0-9]*\\.[0-9]+)\"\nfloat    = prefloat | re.cat(prefloat | re\"[-+]?[0-9]+\", re\"[eE][-+]?[0-9]+\")\nnumber   = dec | hex | oct | float\nnumbers  = re.cat(re.opt(number), re.rep(re\" +\" * number), re\" *\")\n\n# Register action names to regular expressions.\nnumber.actions[:enter] = [:mark]\nint.actions[:exit]     = [:dec]\nhex.actions[:exit]     = [:hex]\noct.actions[:exit]     = [:oct]\nfloat.actions[:exit]   = [:float]\n\n# Compile a finite-state machine.\nmachine = Automa.compile(numbers)\n\n#= This generates a SVG file to visualize the state machine.\nwrite(\"numbers.dot\", Automa.dfa2dot(machine.dfa))\nrun(`dot -Tsvg -o numbers.svg numbers.dot`)\n=#\n\n# Bind an action code for each action name.\nactions = Dict(\n    :mark  => :(mark = p),\n    :dec   => :(emit(:dec)),\n    :hex   => :(emit(:hex)),\n    :oct   => :(emit(:oct)),\n    :float => :(emit(:float)),\n)\n\n# Generate a tokenizing function from the machine.\n@eval function tokenize(data::String)\n    tokens = Tuple{Symbol,String}[]\n    mark = 0\n    $(Automa.generate_init_code(machine))\n    p_end = p_eof = endof(data)\n    emit(kind) = push!(tokens, (kind, data[mark:p-1]))\n    $(Automa.generate_exec_code(machine, actions=actions))\n    return tokens, cs == 0 ? :ok : cs < 0 ? :error : :incomplete\nend\n\ntokens, status = tokenize(\"1 0x0123BEEF 0o754 3.14 -1e4 +6.022045e23\")Finally, space-separated numbers are tokenized as follows:julia> tokens\n6-element Array{Tuple{Symbol,String},1}:\n (:dec,\"1\")\n (:hex,\"0x0123BEEF\")\n (:oct,\"0o754\")\n (:float,\"3.14\")\n (:float,\"1e-4\")\n (:float,\"+6.022045e23\")\n\njulia> status\n:ok\n(Image: )"
},

{
    "location": "index.html#Overview-1",
    "page": "Home",
    "title": "Overview",
    "category": "section",
    "text": "Automa.jl is composed of three elements: regular expressions, compilers, and code generators. Regular expressions are used to specify patterns that you want to match and bind actions to. A regular expression can be built using APIs provided from the Automa.RegExp module. The regular expression with actions is then fed to a compiler function that creates a finite state machine and optimizes it to minimize the number of states. Finally, the machine object is used to generate Julia code that can be spliced into functions.Machines are byte-oriented in a sense that input data fed into a machine is a sequence of bytes. The generated code of a machine reads input data byte by byte and updates a current state variable based on transition rules defined by regular expressions. If one or more actions are associated to a state transition they will be executed before reading a next byte. If no transition rule is found for a byte of a specific state the machine sets the current state to an error value, stops executing, and breaks from a loop."
},

{
    "location": "index.html#Regular-expressions-1",
    "page": "Home",
    "title": "Regular expressions",
    "category": "section",
    "text": "Regular expressions in Automa.jl is somewhat more restricted than usual regular expressions in Julia. Some features like lookahead or backreference are not provided. In Automa.jl, re\"...\" is used instead of r\"...\" because these are different regular expressions. However, the syntax of Automa.jl's regular expressions is a subset of Julia's ones and hence it would be already familiar. Some examples are shown below:decimal    = re\"[-+]?[0-9]+\"\nkeyword    = re\"if|else|while|end\"\nidentifier = re\"[A-Za-z_][0-9A-Za-z_]*\"An important feature of regular expressions is composition of (sub-) regular expressions. One or more regular expressions can be composed using following functions:Function Alias Meaning\ncat(re...) * concatenation\nalt(re1, re2...) | alternation\nrep(re)  zero or more repetition\nrep1(re)  one or more repetition\nopt(re)  zero or one repetition\nisec(re1, re2) & intersection\ndiff(re1, re2) \\ difference (subtraction)\nneg(re) ! negationActions can be bind to regular expressions. Currently, there are three kinds of actions: enter, exit, and final. Enter actions will be executed when it enters the regular expression. In contrast, exit actions will be executed when it exits from the regular expression. Final actions will be executed every time when it reaches a final (or accept) state. The following code and figure demonstrate transitions and actions between states.using Automa\nusing Automa.RegExp\nconst re = Automa.RegExp\n\na = re\"a*\"\nb = re\"b\"\nab = a * b\n\na.actions[:enter] = [:enter_a]\na.actions[:exit]  = [:exit_a]\na.actions[:final] = [:final_a]\nb.actions[:enter] = [:enter_b]\nb.actions[:exit]  = [:exit_b]\nb.actions[:final] = [:final_b](Image: )"
},

{
    "location": "index.html#Compilers-1",
    "page": "Home",
    "title": "Compilers",
    "category": "section",
    "text": "After finished defining a regular expression with optional actions you can compile it into a finite-state machine using the compile function. The Machine type is defined as follows:type Machine\n    states::UnitRange{Int}\n    start_state::Int\n    final_states::Set{Int}\n    transitions::Dict{Int,Dict{UInt8,Tuple{Int,Vector{Symbol}}}}\n    eof_actions::Dict{Int,Vector{Symbol}}\n    dfa::DFA\nendFor the purpose of debugging, Automa.jl offers the execute function, which emulates the machine execution and returns the last state with the action log. Let's execute a machine of re\"a*b\" with actions used in the previous example.julia> machine = compile(ab)\nAutoma.Machine(<states=1:3,start_state=1,final_states=Set([0,2])>)\n\njulia> Automa.execute(machine, \"b\")\n(2,Symbol[:enter_a,:exit_a,:enter_b,:final_b,:exit_b])\n\njulia> Automa.execute(machine, \"ab\")\n(2,Symbol[:enter_a,:final_a,:exit_a,:enter_b,:final_b,:exit_b])\n\njulia> Automa.execute(machine, \"aab\")\n(2,Symbol[:enter_a,:final_a,:final_a,:exit_a,:enter_b,:final_b,:exit_b])\nThe Tokenizer type is also a useful tool built on top of Machine:type Tokenizer\n    machine::Machine\n    actions_code::Vector{Tuple{Symbol,Expr}}\nendA tokenizer can be created using the compile function as well but the argument types are different. When defining a tokenizer, compile takes a list of pattern and action pairs as follows:tokenizer = compile(\n    re\"if|else|while|end\"      => :(emit(:keyword)),\n    re\"[A-Za-z_][0-9A-Za-z_]*\" => :(emit(:identifier)),\n    re\"[0-9]+\"                 => :(emit(:decimal)),\n    re\"=\"                      => :(emit(:assign)),\n    re\"(\"                      => :(emit(:lparen)),\n    re\")\"                      => :(emit(:rparen)),\n    re\"[-+*/]\"                 => :(emit(:operator)),\n    re\"[\\n\\t ]+\"               => :(),\n)A tokenizer tries to find the longest token that is available from the current reading position. When multiple patterns match a substring of the same length, higher priority token placed at a former position in the arguments list will be selected. For example, \"else\" matches both :keyword and :identifier but the :keyword action will be run because it is placed before :identifier in the arguments list."
},

{
    "location": "index.html#Code-generators-1",
    "page": "Home",
    "title": "Code generators",
    "category": "section",
    "text": "Once a machine or a tokenizer is created it's ready to generate Julia code using metaprogramming techniques.  Here is an example to count the number of words in a string:using Automa\nusing Automa.RegExp\nconst re = Automa.RegExp\n\nword = re\"[A-Za-z]+\"\nwords = re.cat(re.opt(word), re.rep(re\" +\" * word), re\" *\")\n\nword.actions[:exit] = [:word]\n\nmachine = compile(words)\n\nactions = Dict(:word => :(count += 1))\n\n# Generate a function using @eval.\n@eval function count_words(data)\n    # initialize a result variable\n    count = 0\n\n    # generate code to initialize variables used by FSM\n    $(generate_init_code(machine))\n\n    # set end and EOF positions of data buffer\n    p_end = p_eof = endof(data)\n\n    # generate code to execute FSM\n    $(generate_exec_code(machine, actions=actions))\n\n    # check if FSM properly finished\n    if cs != 0\n        error(\"failed to count words\")\n    end\n\n    return count\nendThis will work as we expect:julia> count_words(\"\")\n0\n\njulia> count_words(\"The\")\n1\n\njulia> count_words(\"The quick\")\n2\n\njulia> count_words(\"The quick brown\")\n3\n\njulia> count_words(\"The quick brown fox\")\n4\n\njulia> count_words(\"A!\")\nERROR: failed to count words\n in count_words(::String) at ./REPL[10]:16\nThere are two functions that generate Julia and splice Julia code into a function. The first function is generate_init_code, which generates some code to declare and initialize local variables used by FSM.julia> generate_init_code(machine)\nquote  # /Users/kenta/.julia/v0.5/Automa/src/codegen.jl, line 13:\n    p::Int = 1 # /Users/kenta/.julia/v0.5/Automa/src/codegen.jl, line 14:\n    p_end::Int = 0 # /Users/kenta/.julia/v0.5/Automa/src/codegen.jl, line 15:\n    p_eof::Int = -1 # /Users/kenta/.julia/v0.5/Automa/src/codegen.jl, line 16:\n    cs::Int = 1\nend\nThe input byte sequence is stored in the data variable, which, in this case, is passed as an argument. The variable p points at the next byte position in data. p_end points at the end position of data available in data. p_eof is similar to p_end but it points at the actual end of the input sequence. In the example above, p_end and p_eof are soon set to sizeof(data) because these two values can be determined immediately. p_eof would be undefined when data is too long to store in memory. In such a case, p_eof is set to a negative integer at the beginning and later set to a suitable position when the end of an input sequence is seen. The cs variable stores the current state of a machine.The second function is generate_exec_code, which generates a loop to emulate the FSM by updating cs (current state) while reading bytes from data. You don't need to care about the details of generated code because it is often too complicated to read for human. In short, the generated code tries to read as many bytes as possible from data and stops when it reaches p_end or when it fails transition.After finished execution, the value stored in cs indicates whether the execution successfully finished or not. cs == 0 means the FSM read all data and finished successfully. cs < 0 means it failed somewhere. cs > 0 means it is still in the middle of execution and needs more input data if any. The following snippet is a pseudocode of the machine execution:# start main loop\nwhile p ≤ p_end && cs > 0\n    l  = {{read a byte of `data` at position `p`}}\n    ns = {{next state of `cs` with label `l`}}\n    {{execute actions if any}}\n    cs = ns  # update the state variable\n    p += 1   # increment the position variable\nend\n\nif p_eof ≥ 0 && p > p_eof && cs ∈ machine.final_states\n    let ns = 0\n        {{execute EOF actions if any}}\n        cs = ns\n    end\nelseif cs < 0\n    p -= 1  # point at the last read byte\nend"
},

]}
