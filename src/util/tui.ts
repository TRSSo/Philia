import * as inquirer from "@inquirer/prompts"

export async function continueTui(message = "按回车键继续") {
  if (!(await inquirer.confirm({ message }))) process.exit()
}
