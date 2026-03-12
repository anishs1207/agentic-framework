


// for /user methpod
@Controller('user')
export class UserController {
    constructor(private userService: UserService) {}

    // /user/method here
    @Get('me')
    getMe(@getDefaultResultOrder() user: User) {
        return user;
    }

    @Post() 
    postMe() {

    }

    @Patch()
    editUser(
        @GetUser('id') userId: number,
        @Body() dto: EditUserDto
    ) {
        return this.userService.editUser(UserModul)
    }
}