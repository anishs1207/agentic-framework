class Tool {
    constructor(name, description, func) {
        this.name = name;
        this.description = description;
        this.func = func;
    }

    function execute(input: any) {
        return await this.func(input);
    }
}