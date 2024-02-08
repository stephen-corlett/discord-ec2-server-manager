import EC2Client from './ec2Client';
import {
  DescribeInstancesCommand,
  StartInstancesCommand,
  StopInstancesCommand,
  waitUntilInstanceRunning,
  Instance,
} from '@aws-sdk/client-ec2';

class EC2Service {
  constructor(private ec2Client = EC2Client) {}

  async describeInstance(instanceId: string): Promise<Instance> {
    const command = new DescribeInstancesCommand({
      InstanceIds: [instanceId],
    });
    const data = await this.ec2Client.send(command);
    return data.Reservations[0].Instances[0];
  }

  async startInstance(instanceId: string): Promise<void> {
    const command = new StartInstancesCommand({
      InstanceIds: [instanceId],
    });
    await this.ec2Client.send(command);
  }

  async stopInstance(instanceId: string): Promise<void> {
    const command = new StopInstancesCommand({
      InstanceIds: [instanceId],
    });
    await this.ec2Client.send(command);
  }

  async waitForInstanceRunning(instanceId: string): Promise<void> {
    await waitUntilInstanceRunning(
      { client: this.ec2Client, maxWaitTime: 120, minDelay: 2, maxDelay: 10 },
      { InstanceIds: [instanceId] }
    );
  }
}

export default EC2Service;
